import "server-only";
import { connect, constants } from "node:http2";
import { timingSafeEqual } from "node:crypto";
import { PKPass } from "passkit-generator";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  disenoEfectivo,
  type CafeteriaDiseno,
  type DisenoTarjeta,
  type ProgramaDiseno,
  type TipoCodigo,
} from "@/lib/diseno";
import { origenPublico } from "@/lib/origen";
import { imagenDeStorage } from "@/lib/imagen-storage";
import { imagenSellos } from "@/lib/imagen-sellos";
import { imagenIcono, imagenLogo } from "@/lib/imagen-apple";

// Apple Wallet: un solo Pass Type ID y certificado de la plataforma para
// todas las cafeterías. Viven en variables de entorno de Vercel:
//   APPLE_PASS_TYPE_ID          ej. pass.mx.fidely.tarjeta
//   APPLE_TEAM_ID               Team ID de la cuenta de Apple Developer
//   APPLE_PASS_CERT             certificado del Pass Type ID (PEM, tal cual o en base64)
//   APPLE_PASS_KEY              su llave privada (PEM, tal cual o en base64)
//   APPLE_PASS_KEY_PASSPHRASE   contraseña de la llave (si tiene)
//   APPLE_WWDR_CERT             certificado intermedio WWDR de Apple (PEM)

const APNS = process.env.APPLE_APNS_URL ?? "https://api.push.apple.com";

type Config = {
  passTypeId: string;
  teamId: string;
  certificado: string;
  llave: string;
  frase?: string;
  wwdr: string;
};

let configCache: Config | null | undefined;

function pem(valor: string | undefined) {
  const v = valor?.trim();
  if (!v) return null;
  const texto = v.includes("-----BEGIN") ? v : Buffer.from(v, "base64").toString("utf8");
  return texto.includes("-----BEGIN") ? texto.replace(/\\n/g, "\n") : null;
}

// null = Apple Wallet no está configurado (el botón no se muestra)
export function configApple(): Config | null {
  if (configCache !== undefined) return configCache;
  configCache = null;

  const passTypeId = process.env.APPLE_PASS_TYPE_ID?.trim();
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const certificado = pem(process.env.APPLE_PASS_CERT);
  const llave = pem(process.env.APPLE_PASS_KEY);
  const wwdr = pem(process.env.APPLE_WWDR_CERT);
  if (!passTypeId?.startsWith("pass.") || !teamId || !/^[A-Z0-9]{10}$/.test(teamId)) return null;
  if (!certificado || !llave || !wwdr) return null;

  configCache = {
    passTypeId,
    teamId,
    certificado,
    llave,
    frase: process.env.APPLE_PASS_KEY_PASSPHRASE || undefined,
    wwdr,
  };
  return configCache;
}

// ---------------------------------------------------------------------
//  Lectura de datos (llave de servicio: se llama desde rutas públicas)
// ---------------------------------------------------------------------

type ProgramaApple = ProgramaDiseno & {
  id: string;
  nombre: string;
  descripcion: string | null;
  premio: string;
  sellos_requeridos: number;
  actualizado_en: string;
};

type CafeteriaApple = CafeteriaDiseno & { actualizado_en: string };

type TarjetaApple = {
  id: string;
  codigo: string;
  serial: string;
  token: string;
  sellos: number;
  premiosCanjeados: number;
  plataforma: string | null;
  actualizadoEn: string;
  cliente: string;
  cafeteria: CafeteriaApple;
  programa: ProgramaApple;
};

const COLUMNAS_PROGRAMA =
  "id, nombre, descripcion, premio, sellos_requeridos, actualizado_en, logo_horizontal_url, logo_cuadrado_url, color_fondo, color_etiquetas, color_texto, icono_sello, icono_sello_url, icono_sello_inactivo, icono_sello_inactivo_url, color_sello_activo, color_sello_inactivo, color_fondo_sello, tipo_codigo";

const uno = <T,>(x: unknown): T | null =>
  ((Array.isArray(x) ? x[0] : x) as T | undefined) ?? null;

async function leerTarjeta(campo: "codigo" | "serial_apple", valor: string): Promise<TarjetaApple | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tarjetas")
    .select(
      `id, codigo, serial_apple, token_apple, sellos_actuales, premios_canjeados, plataforma, actualizado_en,
       clientes ( nombre ),
       cafeterias ( nombre, logo_url, color_fondo, color_texto, color_etiquetas, actualizado_en ),
       programas ( ${COLUMNAS_PROGRAMA} )`,
    )
    .eq(campo, valor)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer la tarjeta: ${error.message}`);
  if (!data) return null;

  const cliente = uno<{ nombre: string }>(data.clientes);
  const cafeteria = uno<CafeteriaApple>(data.cafeterias);
  const programa = uno<ProgramaApple>(data.programas);
  if (!cliente || !cafeteria || !programa) return null;

  return {
    id: data.id as string,
    codigo: data.codigo as string,
    serial: data.serial_apple as string,
    token: data.token_apple as string,
    sellos: data.sellos_actuales as number,
    premiosCanjeados: data.premios_canjeados as number,
    plataforma: (data.plataforma as string | null) ?? null,
    actualizadoEn: data.actualizado_en as string,
    cliente: cliente.nombre,
    cafeteria,
    programa,
  };
}

// Marca de tiempo de Postgres a microsegundos (Date solo llega a
// milisegundos y se perderían cambios hechos en el mismo milisegundo)
export function microsegundos(marca: string) {
  const m = /^(.*?:\d{2})(?:\.(\d{1,6}))?([+-]\d{2}(?::?\d{2})?|Z)$/.exec(marca);
  if (!m) return BigInt(Date.parse(marca)) * BigInt(1000);
  const segundos = Date.parse(`${m[1]}${m[3]}`);
  return BigInt(segundos) * BigInt(1000) + BigInt((m[2] ?? "").padEnd(6, "0"));
}

// Última vez que cambió algo que se ve en el pase
function ultimoCambio(t: TarjetaApple) {
  return new Date(
    Math.max(
      Date.parse(t.actualizadoEn),
      Date.parse(t.programa.actualizado_en),
      Date.parse(t.cafeteria.actualizado_en),
    ),
  );
}

// ---------------------------------------------------------------------
//  Contenido del pase
// ---------------------------------------------------------------------

const CODIGO_APPLE: Record<TipoCodigo, "PKBarcodeFormatQR" | "PKBarcodeFormatAztec" | "PKBarcodeFormatPDF417" | "PKBarcodeFormatCode128"> = {
  qr: "PKBarcodeFormatQR",
  aztec: "PKBarcodeFormatAztec",
  pdf417: "PKBarcodeFormatPDF417",
  code128: "PKBarcodeFormatCode128",
};

// "#5D2E2A" -> "rgb(93, 46, 42)" (el formato que pide Apple)
function rgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

const agrupado = (codigo: string) => codigo.match(/.{1,4}/g)?.join(" ") ?? codigo;

function construirPassJson(config: Config, t: TarjetaApple, d: DisenoTarjeta, origen: string, conLogo: boolean) {
  const { programa, cafeteria } = t;
  const total = programa.sellos_requeridos;
  const completa = t.sellos >= total;
  const faltan = Math.max(0, total - t.sellos);
  const link = `${origenPublico(origen)}/t/${t.codigo}`;

  return {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeId,
    teamIdentifier: config.teamId,
    serialNumber: t.serial,
    authenticationToken: t.token,
    webServiceURL: `${origenPublico(origen)}/api/wallet/apple`,
    organizationName: cafeteria.nombre,
    description: `Tarjeta de lealtad de ${cafeteria.nombre}`,
    ...(conLogo ? {} : { logoText: cafeteria.nombre }),
    backgroundColor: rgb(d.colorFondo),
    foregroundColor: rgb(d.colorTexto),
    labelColor: rgb(d.colorEtiquetas),
    sharingProhibited: true,
    barcodes: [
      {
        format: CODIGO_APPLE[d.tipoCodigo],
        message: t.codigo,
        messageEncoding: "iso-8859-1",
        altText: agrupado(t.codigo),
      },
    ],
    storeCard: {
      headerFields: [{ key: "sellos", label: "SELLOS", value: `${t.sellos} de ${total}` }],
      secondaryFields: [
        { key: "premio", label: "PREMIO", value: programa.premio },
        {
          key: "estado",
          label: completa ? "¡LISTO!" : "TE FALTAN",
          value: completa ? "¡Premio listo!" : `${faltan} sello${faltan === 1 ? "" : "s"}`,
          // Lo que sale en la notificación cuando cambia
          changeMessage: completa ? "%@ Muestra tu tarjeta en caja." : "Te faltan %@ para tu premio.",
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      auxiliaryFields: [
        { key: "cliente", label: "CLIENTE", value: t.cliente },
        {
          key: "canjeados",
          label: "PREMIOS CANJEADOS",
          value: t.premiosCanjeados,
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      backFields: [
        { key: "programa", label: "Programa", value: programa.descripcion ? `${programa.nombre}\n${programa.descripcion}` : programa.nombre },
        {
          key: "como",
          label: "¿Cómo funciona?",
          value: `Muestra esta tarjeta en caja en cada compra para recibir un sello. Al juntar ${total} sellos te llevas: ${programa.premio}.`,
        },
        {
          key: "link",
          label: "Tu tarjeta en línea",
          value: link,
          attributedValue: `<a href="${link}">Ver mi tarjeta</a>`,
        },
        { key: "codigo", label: "Código de tu tarjeta", value: agrupado(t.codigo) },
        { key: "fidely", label: "", value: "Tarjetas de lealtad con Fidely" },
      ],
    },
  };
}

// Tamaños de las imágenes del pase (1x, 2x, 3x)
const ESCALAS = [1, 2, 3] as const;
const sufijo = (e: number) => (e === 1 ? "" : `@${e}x`);

async function png(respuesta: Response) {
  return Buffer.from(await respuesta.arrayBuffer());
}

// Arma y firma el .pkpass de una tarjeta
async function firmarPase(config: Config, t: TarjetaApple, origen: string) {
  const d = disenoEfectivo(t.cafeteria, t.programa);

  // Imágenes propias (solo del almacenamiento de Fidely)
  const [logo, logoCuadrado, iconoActivo, iconoInactivo] = await Promise.all([
    imagenDeStorage(d.logoHorizontal),
    imagenDeStorage(d.logoCuadrado),
    imagenDeStorage(d.iconoSelloUrl),
    imagenDeStorage(d.iconoSelloInactivoUrl),
  ]);
  const disenoSellos = { ...d, iconoSelloUrl: iconoActivo, iconoSelloInactivoUrl: iconoInactivo };
  const llenos = Math.min(t.sellos, t.programa.sellos_requeridos);

  const archivos: Record<string, Buffer> = {};
  await Promise.all(
    ESCALAS.flatMap((e) => [
      // Franja con los sellos (storeCard: 375 x 123 puntos)
      png(
        imagenSellos({
          diseno: disenoSellos,
          total: t.programa.sellos_requeridos,
          llenos,
          ancho: 375 * e,
          alto: 123 * e,
        }),
      ).then((b) => (archivos[`strip${sufijo(e)}.png`] = b)),
      // Ícono (notificaciones y pantalla de bloqueo: 29 x 29 puntos)
      png(imagenIcono(d, logoCuadrado, 29 * e)).then((b) => (archivos[`icon${sufijo(e)}.png`] = b)),
      // Logo (hasta 160 x 50 puntos)
      ...(logo
        ? [png(imagenLogo(logo, 160 * e, 50 * e)).then((b) => (archivos[`logo${sufijo(e)}.png`] = b))]
        : []),
    ]),
  );

  const passJson = construirPassJson(config, t, d, origen, Boolean(logo));
  const pase = new PKPass(
    { ...archivos, "pass.json": Buffer.from(JSON.stringify(passJson)) },
    {
      wwdr: config.wwdr,
      signerCert: config.certificado,
      signerKey: config.llave,
      signerKeyPassphrase: config.frase,
    },
  );
  return pase.getAsBuffer();
}

// ---------------------------------------------------------------------
//  Lo que usa la app
// ---------------------------------------------------------------------

// Pase para el botón "Agregar a Apple Wallet" (el código de la tarjeta es la llave)
export async function paseParaCodigo(codigo: string, origen: string) {
  const config = configApple();
  if (!config) return null;
  const t = await leerTarjeta("codigo", codigo);
  if (!t) return null;
  return { pase: await firmarPase(config, t, origen), modificado: ultimoCambio(t) };
}

// Compara el token "ApplePass <token>" sin revelar por tiempos cuál es
function tokenValido(encabezado: string | null, token: string) {
  const recibido = Buffer.from(encabezado?.replace(/^ApplePass /, "") ?? "");
  const esperado = Buffer.from(token);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

export type Autorizada =
  | { ok: true; tarjeta: TarjetaApple; config: Config }
  | { ok: false; status: 401 | 404 };

// Para el web service: la tarjeta del serial, si el token coincide
export async function tarjetaAutorizada(
  passTypeId: string,
  serial: string,
  autorizacion: string | null,
): Promise<Autorizada> {
  const config = configApple();
  if (!config || passTypeId !== config.passTypeId) return { ok: false, status: 404 };
  if (serial.length > 64) return { ok: false, status: 404 };
  const t = await leerTarjeta("serial_apple", serial);
  if (!t) return { ok: false, status: 401 };
  if (!tokenValido(autorizacion, t.token)) return { ok: false, status: 401 };
  return { ok: true, tarjeta: t, config };
}

export async function paseFirmado(a: Extract<Autorizada, { ok: true }>, origen: string) {
  return { pase: await firmarPase(a.config, a.tarjeta, origen), modificado: ultimoCambio(a.tarjeta) };
}

// Un iPhone guardó la tarjeta: se registra para mandarle avisos
export async function registrarDispositivo(
  tarjeta: TarjetaApple,
  passTypeId: string,
  dispositivo: string,
  pushToken: string,
) {
  const admin = createAdminClient();
  const { error: errorDisp } = await admin
    .from("apple_dispositivos")
    .upsert({ device_library_id: dispositivo, push_token: pushToken });
  if (errorDisp) throw new Error(`No se pudo guardar el dispositivo: ${errorDisp.message}`);

  const { data, error } = await admin
    .from("apple_registros")
    .upsert(
      { device_library_id: dispositivo, pass_type_id: passTypeId, serial_apple: tarjeta.serial },
      { ignoreDuplicates: true },
    )
    .select("serial_apple");
  if (error) throw new Error(`No se pudo registrar la tarjeta: ${error.message}`);

  if (!tarjeta.plataforma) {
    await admin.from("tarjetas").update({ plataforma: "apple" }).eq("id", tarjeta.id);
  }
  // Con ignoreDuplicates no regresa la fila si ya existía
  return (data?.length ?? 0) > 0;
}

// La quitó del iPhone
export async function quitarRegistro(passTypeId: string, dispositivo: string, serial: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("apple_registros")
    .delete()
    .eq("device_library_id", dispositivo)
    .eq("pass_type_id", passTypeId)
    .eq("serial_apple", serial);
  if (error) throw new Error(`No se pudo quitar el registro: ${error.message}`);

  // Si el iPhone ya no tiene tarjetas, se borra
  const { count } = await admin
    .from("apple_registros")
    .select("serial_apple", { count: "exact", head: true })
    .eq("device_library_id", dispositivo);
  if (count === 0) {
    await admin.from("apple_dispositivos").delete().eq("device_library_id", dispositivo);
  }
}

// Qué tarjetas de este iPhone cambiaron desde la última vez que preguntó.
// La "etiqueta" que se le regresa es la marca de tiempo más nueva (en
// microsegundos); el iPhone la manda de vuelta la siguiente vez.
export async function tarjetasActualizadas(passTypeId: string, dispositivo: string, desde: string | null) {
  const config = configApple();
  if (!config || passTypeId !== config.passTypeId) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("apple_registros")
    .select("serial_apple, tarjetas ( actualizado_en, programas ( actualizado_en ), cafeterias ( actualizado_en ) )")
    .eq("device_library_id", dispositivo)
    .eq("pass_type_id", passTypeId);
  if (error) throw new Error(`No se pudieron leer los registros: ${error.message}`);

  let limite: bigint | null = null;
  if (desde && /^\d{1,20}$/.test(desde)) limite = BigInt(desde);

  let maximo = BigInt(0);
  const seriales: string[] = [];
  for (const r of data) {
    const t = uno<{ actualizado_en: string; programas: unknown; cafeterias: unknown }>(r.tarjetas);
    if (!t) continue;
    const marcas = [
      t.actualizado_en,
      uno<{ actualizado_en: string }>(t.programas)?.actualizado_en,
      uno<{ actualizado_en: string }>(t.cafeterias)?.actualizado_en,
    ].filter((m): m is string => Boolean(m));
    const cambio = marcas.map(microsegundos).reduce((a, b) => (b > a ? b : a), BigInt(0));
    if (cambio > maximo) maximo = cambio;
    if (limite === null || cambio > limite) seriales.push(r.serial_apple as string);
  }
  return { seriales, etiqueta: maximo.toString() };
}

// ---------------------------------------------------------------------
//  Avisos a los iPhones (APNs): el iPhone, al recibirlo, pide la tarjeta
//  nueva al web service. Nunca lanzan error: un fallo de Apple no debe
//  impedir el sello.
// ---------------------------------------------------------------------

async function avisar(config: Config, tokens: { dispositivo: string; token: string }[]) {
  if (tokens.length === 0) return;
  const sesion = connect(APNS, {
    cert: config.certificado,
    key: config.llave,
    passphrase: config.frase,
    ...(process.env.APPLE_APNS_CA ? { ca: pem(process.env.APPLE_APNS_CA) ?? undefined } : {}),
  });
  sesion.on("error", (e) => console.error("Error de conexión con Apple (APNs):", e.message));

  const invalidos: string[] = [];
  try {
    await Promise.all(
      tokens.map(
        ({ dispositivo, token }) =>
          new Promise<void>((resolver) => {
            const solicitud = sesion.request({
              [constants.HTTP2_HEADER_METHOD]: "POST",
              [constants.HTTP2_HEADER_PATH]: `/3/device/${token}`,
              "apns-topic": config.passTypeId,
              "content-type": "application/json",
            });
            solicitud.setTimeout(10000, () => solicitud.close(constants.NGHTTP2_CANCEL));
            let status = 0;
            let cuerpo = "";
            solicitud.on("response", (h) => (status = Number(h[constants.HTTP2_HEADER_STATUS])));
            solicitud.on("data", (c) => (cuerpo += c));
            solicitud.on("error", (e) => {
              console.error("No se pudo avisar al iPhone:", e.message);
              resolver();
            });
            solicitud.on("close", () => {
              // 410: ya no tiene la tarjeta; 400 BadDeviceToken: token inválido
              if (status === 410 || (status === 400 && cuerpo.includes("BadDeviceToken"))) {
                invalidos.push(dispositivo);
              } else if (status !== 200) {
                console.error(`Apple rechazó el aviso (${status}): ${cuerpo}`);
              }
              resolver();
            });
            solicitud.end("{}");
          }),
      ),
    );
  } finally {
    sesion.close();
  }

  if (invalidos.length > 0) {
    await createAdminClient().from("apple_dispositivos").delete().in("device_library_id", invalidos);
  }
}

type FilaRegistro = { device_library_id: string; apple_dispositivos: unknown };

function tokensDe(filas: FilaRegistro[]) {
  const vistos = new Map<string, string>();
  for (const f of filas) {
    const token = uno<{ push_token: string }>(f.apple_dispositivos)?.push_token;
    if (token) vistos.set(f.device_library_id, token);
  }
  return [...vistos].map(([dispositivo, token]) => ({ dispositivo, token }));
}

// Tras un sello o canje: avisa a los iPhones que tienen esa tarjeta
export async function actualizarTarjetaApple(codigo: string) {
  const config = configApple();
  if (!config) return;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("apple_registros")
      .select("device_library_id, apple_dispositivos ( push_token ), tarjetas!inner ( codigo )")
      .eq("pass_type_id", config.passTypeId)
      .eq("tarjetas.codigo", codigo);
    if (error) throw new Error(error.message);
    await avisar(config, tokensDe(data));
  } catch (e) {
    console.error("No se pudo actualizar la tarjeta en Apple Wallet:", e);
  }
}

// Tras cambiar el programa o su diseño: avisa a todas sus tarjetas
export async function actualizarProgramaApple(programaId: string) {
  const config = configApple();
  if (!config) return;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("apple_registros")
      .select("device_library_id, serial_apple, apple_dispositivos ( push_token ), tarjetas!inner ( programa_id )")
      .eq("pass_type_id", config.passTypeId)
      .eq("tarjetas.programa_id", programaId)
      .limit(5000);
    if (error) throw new Error(error.message);
    await avisar(config, tokensDe(data));
  } catch (e) {
    console.error("No se pudo actualizar el programa en Apple Wallet:", e);
  }
}
