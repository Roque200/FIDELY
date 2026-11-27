import "server-only";
import { createSign } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { disenoEfectivo, type CafeteriaDiseno, type ProgramaDiseno, type TipoCodigo } from "@/lib/diseno";
import { origenPublico } from "@/lib/origen";

// Google Wallet: una Loyalty Class por programa y un Loyalty Object por tarjeta.
// Las llaves viven en variables de entorno de Vercel:
//   GOOGLE_WALLET_ISSUER_ID       número de emisor (Google Pay & Wallet Console)
//   GOOGLE_WALLET_CREDENCIALES    JSON de la cuenta de servicio (tal cual o en base64)

const API = process.env.GOOGLE_WALLET_API_BASE ?? "https://walletobjects.googleapis.com/walletobjects/v1";
const TOKEN_URL = process.env.GOOGLE_OAUTH_TOKEN_URL ?? "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

type Config = { issuerId: string; correo: string; llave: string };

let configCache: Config | null | undefined;

// null = Google Wallet no está configurado (el botón no se muestra)
export function configGoogle(): Config | null {
  if (configCache !== undefined) return configCache;
  configCache = null;

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
  const crudo = process.env.GOOGLE_WALLET_CREDENCIALES?.trim();
  if (!issuerId || !/^\d+$/.test(issuerId) || !crudo) return null;

  try {
    const texto = crudo.startsWith("{") ? crudo : Buffer.from(crudo, "base64").toString("utf8");
    const json = JSON.parse(texto) as { client_email?: string; private_key?: string };
    if (!json.client_email || !json.private_key) return null;
    configCache = {
      issuerId,
      correo: json.client_email,
      llave: json.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    console.error("GOOGLE_WALLET_CREDENCIALES no es un JSON válido");
  }
  return configCache;
}

const base64url = (datos: string | Buffer) => Buffer.from(datos).toString("base64url");

function firmarJwt(config: Config, payload: Record<string, unknown>) {
  const encabezado = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = base64url(JSON.stringify(payload));
  const firma = createSign("RSA-SHA256").update(`${encabezado}.${cuerpo}`).sign(config.llave);
  return `${encabezado}.${cuerpo}.${base64url(firma)}`;
}

// Token de acceso de la cuenta de servicio (se reutiliza mientras no venza)
let token: { valor: string; vence: number } | null = null;

async function tokenAcceso(config: Config) {
  const ahora = Math.floor(Date.now() / 1000);
  if (token && token.vence - 60 > ahora) return token.valor;

  const asercion = firmarJwt(config, {
    iss: config.correo,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: ahora,
    exp: ahora + 3600,
  });
  const respuesta = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: asercion,
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`Google no dio acceso (${respuesta.status}): ${await respuesta.text()}`);
  }
  const datos = (await respuesta.json()) as { access_token: string; expires_in: number };
  token = { valor: datos.access_token, vence: ahora + datos.expires_in };
  return token.valor;
}

async function llamar(config: Config, metodo: string, ruta: string, cuerpo?: unknown) {
  const respuesta = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${await tokenAcceso(config)}`,
      "Content-Type": "application/json",
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return respuesta;
}

// Crea o reemplaza (si ya existe) una clase u objeto
async function guardar(config: Config, tipo: "loyaltyClass" | "loyaltyObject", recurso: { id: string }) {
  let respuesta = await llamar(config, "POST", `/${tipo}`, recurso);
  if (respuesta.status === 409) {
    respuesta = await llamar(config, "PUT", `/${tipo}/${encodeURIComponent(recurso.id)}`, recurso);
  }
  if (!respuesta.ok) {
    throw new Error(`Google Wallet rechazó ${tipo} (${respuesta.status}): ${await respuesta.text()}`);
  }
}

// ---------------------------------------------------------------------
//  Contenido de la clase (programa) y del objeto (tarjeta)
// ---------------------------------------------------------------------

const CODIGO_GOOGLE: Record<TipoCodigo, string> = {
  qr: "QR_CODE",
  aztec: "AZTEC",
  pdf417: "PDF_417",
  code128: "CODE_128",
};

export const idClase = (config: Config, programaId: string) =>
  `${config.issuerId}.programa-${programaId}`;
export const idObjeto = (config: Config, codigo: string) =>
  `${config.issuerId}.tarjeta-${codigo}`;

type ProgramaGoogle = ProgramaDiseno & {
  id: string;
  nombre: string;
  premio: string;
  sellos_requeridos: number;
  activo: boolean;
  actualizado_en: string;
};

type CafeteriaGoogle = CafeteriaDiseno & { actualizado_en: string };

// Cambia cuando cambia el diseño del programa o de la cafetería: así Google
// vuelve a descargar la imagen de los sellos en lugar de usar la guardada
function versionDiseno(cafeteria: CafeteriaGoogle, programa: ProgramaGoogle) {
  return `${Date.parse(programa.actualizado_en).toString(36)}${Date.parse(cafeteria.actualizado_en).toString(36)}`;
}

function construirClase(
  config: Config,
  cafeteria: CafeteriaDiseno,
  programa: ProgramaGoogle,
  origen: string,
) {
  const d = disenoEfectivo(cafeteria, programa);
  return {
    id: idClase(config, programa.id),
    issuerName: cafeteria.nombre,
    programName: programa.nombre,
    programLogo: {
      sourceUri: { uri: d.logoCuadrado ?? `${origenPublico(origen)}/icono-512.png` },
      contentDescription: {
        defaultValue: { language: "es-MX", value: `Logo de ${cafeteria.nombre}` },
      },
    },
    hexBackgroundColor: d.colorFondo,
    countryCode: "MX",
    reviewStatus: "UNDER_REVIEW",
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
  };
}

function construirObjeto(
  config: Config,
  cafeteria: CafeteriaGoogle,
  programa: ProgramaGoogle,
  tarjeta: { codigo: string; sellos: number; premiosCanjeados: number; cliente: string },
  origen: string,
) {
  const d = disenoEfectivo(cafeteria, programa);
  const completa = tarjeta.sellos >= programa.sellos_requeridos;
  const llenos = Math.min(tarjeta.sellos, programa.sellos_requeridos);
  return {
    id: idObjeto(config, tarjeta.codigo),
    classId: idClase(config, programa.id),
    state: "ACTIVE",
    accountId: tarjeta.codigo.slice(0, 8).toUpperCase(),
    accountName: tarjeta.cliente,
    loyaltyPoints: {
      label: "Sellos",
      balance: { string: `${tarjeta.sellos} de ${programa.sellos_requeridos}` },
    },
    secondaryLoyaltyPoints: {
      label: "Premios",
      balance: { int: tarjeta.premiosCanjeados },
    },
    barcode: {
      type: CODIGO_GOOGLE[d.tipoCodigo],
      value: tarjeta.codigo,
      alternateText: tarjeta.codigo.match(/.{1,4}/g)?.join(" ") ?? tarjeta.codigo,
    },
    textModulesData: [
      {
        id: "premio",
        header: completa ? "¡Premio listo!" : "Premio",
        body: completa
          ? `Muestra esta tarjeta en caja para recibir: ${programa.premio}`
          : `Junta ${programa.sellos_requeridos} sellos y llévate: ${programa.premio}`,
      },
    ],
    linksModuleData: {
      uris: [{ id: "tarjeta", uri: `${origenPublico(origen)}/t/${tarjeta.codigo}`, description: "Ver mi tarjeta" }],
    },
    // Imagen con los sellos (sin datos del cliente)
    heroImage: {
      sourceUri: {
        uri: `${origenPublico(origen)}/api/wallet/sellos/${programa.id}/${llenos}.png?v=${versionDiseno(cafeteria, programa)}`,
      },
      contentDescription: {
        defaultValue: { language: "es-MX", value: `${llenos} de ${programa.sellos_requeridos} sellos` },
      },
    },
  };
}

// ---------------------------------------------------------------------
//  Lectura de datos (llave de servicio: se llama desde rutas públicas)
// ---------------------------------------------------------------------

const COLUMNAS_PROGRAMA =
  "id, nombre, premio, sellos_requeridos, activo, actualizado_en, google_class_id, logo_horizontal_url, logo_cuadrado_url, color_fondo, color_etiquetas, color_texto, icono_sello, icono_sello_url, icono_sello_inactivo, icono_sello_inactivo_url, color_sello_activo, color_sello_inactivo, color_fondo_sello, tipo_codigo";

const uno = <T,>(x: unknown): T | null =>
  ((Array.isArray(x) ? x[0] : x) as T | undefined) ?? null;

async function leerTarjeta(codigo: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tarjetas")
    .select(
      `id, codigo, sellos_actuales, premios_canjeados, google_object_id, plataforma,
       clientes ( nombre ),
       cafeterias ( nombre, logo_url, color_fondo, color_texto, color_etiquetas, actualizado_en ),
       programas ( ${COLUMNAS_PROGRAMA} )`,
    )
    .eq("codigo", codigo)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer la tarjeta: ${error.message}`);
  if (!data) return null;

  const cliente = uno<{ nombre: string }>(data.clientes);
  const cafeteria = uno<CafeteriaGoogle>(data.cafeterias);
  const programa = uno<ProgramaGoogle & { google_class_id: string | null }>(data.programas);
  if (!cliente || !cafeteria || !programa) return null;

  return {
    id: data.id as string,
    codigo: data.codigo as string,
    sellos: data.sellos_actuales as number,
    premiosCanjeados: data.premios_canjeados as number,
    googleObjectId: (data.google_object_id as string | null) ?? null,
    plataforma: (data.plataforma as string | null) ?? null,
    cliente: cliente.nombre,
    cafeteria,
    programa,
  };
}

// ---------------------------------------------------------------------
//  Lo que usa la app
// ---------------------------------------------------------------------

// Crea/actualiza la clase y el objeto y regresa el link "Guardar en Google Wallet"
export async function linkGuardarGoogle(codigo: string, origen: string): Promise<string | null> {
  const config = configGoogle();
  if (!config) return null;

  const t = await leerTarjeta(codigo);
  if (!t) return null;

  await guardar(config, "loyaltyClass", construirClase(config, t.cafeteria, t.programa, origen));
  await guardar(config, "loyaltyObject", construirObjeto(config, t.cafeteria, t.programa, t, origen));

  const admin = createAdminClient();
  if (t.programa.google_class_id !== idClase(config, t.programa.id)) {
    await admin
      .from("programas")
      .update({ google_class_id: idClase(config, t.programa.id) })
      .eq("id", t.programa.id);
  }
  if (t.googleObjectId !== idObjeto(config, t.codigo)) {
    await admin
      .from("tarjetas")
      .update({ google_object_id: idObjeto(config, t.codigo), plataforma: t.plataforma ?? "google" })
      .eq("id", t.id);
  }

  const jwt = firmarJwt(config, {
    iss: config.correo,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [origen],
    payload: { loyaltyObjects: [{ id: idObjeto(config, t.codigo) }] },
  });
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

// Tras un sello o canje: actualiza la tarjeta en la cartera del cliente
// (solo si ya la guardó en Google Wallet). Nunca lanza error: un fallo de
// Google no debe impedir el sello.
export async function actualizarTarjetaGoogle(codigo: string, origen: string) {
  const config = configGoogle();
  if (!config) return;
  try {
    const t = await leerTarjeta(codigo);
    if (!t?.googleObjectId) return;
    await guardar(config, "loyaltyObject", construirObjeto(config, t.cafeteria, t.programa, t, origen));
  } catch (e) {
    console.error("No se pudo actualizar la tarjeta en Google Wallet:", e);
  }
}

// Tras cambiar el programa o su diseño: actualiza la clase y las tarjetas guardadas
export async function actualizarProgramaGoogle(programaId: string, origen: string) {
  const config = configGoogle();
  if (!config) return;
  try {
    const admin = createAdminClient();
    const { data: programa } = await admin
      .from("programas")
      .select(`${COLUMNAS_PROGRAMA}, cafeterias ( nombre, logo_url, color_fondo, color_texto, color_etiquetas, actualizado_en )`)
      .eq("id", programaId)
      .maybeSingle();
    if (!programa?.google_class_id) return;

    const cafeteria = uno<CafeteriaGoogle>(programa.cafeterias);
    if (!cafeteria) return;
    const p = programa as unknown as ProgramaGoogle;
    await guardar(config, "loyaltyClass", construirClase(config, cafeteria, p, origen));

    // El tipo de código y el texto del premio viven en cada tarjeta
    const { data: tarjetas } = await admin
      .from("tarjetas")
      .select("codigo, sellos_actuales, premios_canjeados, clientes ( nombre )")
      .eq("programa_id", programaId)
      .not("google_object_id", "is", null)
      .limit(1000);
    for (const t of tarjetas ?? []) {
      const cliente = uno<{ nombre: string }>(t.clientes);
      await guardar(
        config,
        "loyaltyObject",
        construirObjeto(config, cafeteria, p, {
          codigo: t.codigo as string,
          sellos: t.sellos_actuales as number,
          premiosCanjeados: t.premios_canjeados as number,
          cliente: cliente?.nombre ?? "",
        }, origen),
      );
    }
  } catch (e) {
    console.error("No se pudo actualizar el programa en Google Wallet:", e);
  }
}
