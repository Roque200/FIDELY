"use server";

import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type TarjetaBarista = {
  codigo: string;
  cliente: string;
  programa: string;
  premio: string;
  sellos: number;
  requeridos: number;
  programaActivo: boolean;
  premiosCanjeados: number;
};

export type ResultadoBarista =
  | { ok: true; tarjeta: TarjetaBarista; mensaje: string | null }
  | { ok: false; error: string };

// Acepta el código como viene del escáner o escrito a mano
// ("1717 1a82 ...", con guiones o mayúsculas) o el link /t/<código>
function limpiarCodigo(texto: string) {
  const enLink = /\/t\/([0-9a-fA-F]{32})/.exec(texto);
  const codigo = (enLink ? enLink[1] : texto).toLowerCase().replace(/[\s-]/g, "");
  return /^[0-9a-f]{32}$/.test(codigo) ? codigo : null;
}

async function esStaff() {
  const perfil = await getPerfil();
  return perfil?.tipo === "barista" || perfil?.tipo === "dueno";
}

// Lee la tarjeta con la sesión del barista: RLS solo deja ver las de su cafetería
async function leerTarjeta(codigo: string): Promise<TarjetaBarista | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tarjetas")
    .select(
      "codigo, sellos_actuales, premios_canjeados, clientes ( nombre ), programas ( nombre, premio, sellos_requeridos, activo )",
    )
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la tarjeta: ${error.message}`);
  if (!data) return null;

  const uno = <T,>(x: unknown): T | null =>
    ((Array.isArray(x) ? x[0] : x) as T | undefined) ?? null;
  const cliente = uno<{ nombre: string }>(data.clientes);
  const programa = uno<{
    nombre: string;
    premio: string;
    sellos_requeridos: number;
    activo: boolean;
  }>(data.programas);
  if (!cliente || !programa) return null;

  return {
    codigo: data.codigo as string,
    cliente: cliente.nombre,
    programa: programa.nombre,
    premio: programa.premio,
    sellos: data.sellos_actuales as number,
    requeridos: programa.sellos_requeridos,
    programaActivo: programa.activo,
    premiosCanjeados: data.premios_canjeados as number,
  };
}

const NO_ENCONTRADA = "No encontramos esa tarjeta en tu cafetería.";

export async function buscarTarjeta(texto: string): Promise<ResultadoBarista> {
  if (!(await esStaff())) return { ok: false, error: "Tu sesión no tiene acceso al escáner." };

  const codigo = limpiarCodigo(texto);
  if (!codigo) return { ok: false, error: "Ese código no es de una tarjeta de Fidely." };

  const tarjeta = await leerTarjeta(codigo);
  if (!tarjeta) return { ok: false, error: NO_ENCONTRADA };
  return { ok: true, tarjeta, mensaje: null };
}

// Sellar y canjear pasan por las funciones de la base, que validan
// suscripción, sucursal, límite diario y que el staff esté activo.
async function ejecutar(
  funcion: "registrar_sello" | "canjear_premio",
  texto: string,
  mensaje: string,
): Promise<ResultadoBarista> {
  if (!(await esStaff())) return { ok: false, error: "Tu sesión no tiene acceso al escáner." };

  const codigo = limpiarCodigo(texto);
  if (!codigo) return { ok: false, error: "Ese código no es de una tarjeta de Fidely." };

  const supabase = await createClient();
  const { error } = await supabase.rpc(funcion, { p_codigo: codigo });

  if (error) {
    // Los mensajes de la base ya vienen en español y listos para mostrarse
    // (P0001 = raise exception en las funciones registrar_sello / canjear_premio)
    if (error.code === "P0001") {
      return { ok: false, error: error.message === "Tarjeta no encontrada" ? NO_ENCONTRADA : error.message };
    }
    return { ok: false, error: `No se pudo completar: ${error.message}` };
  }

  const tarjeta = await leerTarjeta(codigo);
  if (!tarjeta) return { ok: false, error: NO_ENCONTRADA };
  return { ok: true, tarjeta, mensaje };
}

export async function sellarTarjeta(codigo: string) {
  return ejecutar("registrar_sello", codigo, "¡Sello agregado!");
}

export async function canjearPremio(codigo: string) {
  return ejecutar("canjear_premio", codigo, "¡Premio canjeado!");
}
