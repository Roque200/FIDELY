"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { cafeteriaPublica } from "@/lib/publico";
import { normalizarTelefono } from "@/lib/telefono";

export type ValoresRegistro = {
  nombre: string;
  telefono: string;
  correo: string;
  programa_id: string;
  acepta: boolean;
};

export type EstadoRegistro = {
  error: string | null;
  // El cliente ya tenía tarjeta de este programa
  yaRegistrado: boolean;
  valores: ValoresRegistro | null;
};

const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Registro público del cliente en /c/[slug]. Usa la llave de servicio porque
// el cliente no tiene cuenta; por eso todo se valida aquí.
export async function registrarCliente(
  _anterior: EstadoRegistro,
  fd: FormData,
): Promise<EstadoRegistro> {
  const texto = (c: string) => String(fd.get(c) ?? "").trim();
  const slug = texto("slug");
  const valores: ValoresRegistro = {
    nombre: texto("nombre").replace(/\s+/g, " "),
    telefono: texto("telefono"),
    correo: texto("correo").toLowerCase(),
    programa_id: texto("programa_id"),
    acepta: fd.get("acepta") === "1",
  };
  const fallo = (error: string): EstadoRegistro => ({ error, yaRegistrado: false, valores });

  // Trampa para robots: campo oculto que una persona no llena
  if (texto("sitio_web")) {
    return fallo("No se pudo completar el registro.");
  }

  if (valores.nombre.length < 2 || valores.nombre.length > 60) {
    return fallo("Escribe tu nombre (de 2 a 60 caracteres).");
  }
  const telefono = valores.telefono ? normalizarTelefono(valores.telefono) : null;
  if (valores.telefono && !telefono) {
    return fallo("El teléfono debe tener 10 dígitos.");
  }
  if (valores.correo && (!CORREO_REGEX.test(valores.correo) || valores.correo.length > 120)) {
    return fallo("El correo no es válido.");
  }
  if (!telefono && !valores.correo) {
    return fallo("Escribe tu teléfono o tu correo (al menos uno).");
  }
  if (!valores.acepta) {
    return fallo("Para registrarte necesitas aceptar el aviso de privacidad.");
  }

  // La cafetería debe existir, estar vigente y el programa debe ser suyo y estar activo
  const publica = await cafeteriaPublica(slug);
  if (!publica) return fallo("Esta cafetería no existe.");
  const programa = publica.programas.find((p) => p.id === valores.programa_id);
  if (!programa) {
    return fallo("Este programa ya no está disponible. Recarga la página.");
  }

  const admin = createAdminClient();
  const cafeteriaId = publica.id;

  // ¿Ya existe el cliente en esta cafetería? (primero por teléfono, luego por correo)
  async function buscarCliente() {
    for (const [campo, valor] of [
      ["telefono", telefono],
      ["correo", valores.correo || null],
    ] as const) {
      if (!valor) continue;
      const { data, error } = await admin
        .from("clientes")
        .select("id")
        .eq("cafeteria_id", cafeteriaId)
        .eq(campo, valor)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) return data.id as string;
    }
    return null;
  }

  let clienteId = await buscarCliente();

  if (!clienteId) {
    const { data, error } = await admin
      .from("clientes")
      .insert({
        cafeteria_id: cafeteriaId,
        nombre: valores.nombre,
        telefono,
        correo: valores.correo || null,
        acepta_privacidad: true,
      })
      .select("id")
      .single();

    if (error) {
      // Se registró al mismo tiempo desde otro lado: usar el que quedó
      if (error.code === "23505") clienteId = await buscarCliente();
      if (!clienteId) return fallo(`No se pudo completar el registro: ${error.message}`);
    } else {
      clienteId = data.id as string;
    }
  }

  // Si ya tiene tarjeta de este programa NO se muestra: alguien podría poner
  // el teléfono de otra persona y quedarse con sus sellos.
  const { data: existente, error: errorExistente } = await admin
    .from("tarjetas")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("programa_id", programa.id)
    .maybeSingle();
  if (errorExistente) return fallo(`No se pudo completar el registro: ${errorExistente.message}`);
  if (existente) {
    return { error: null, yaRegistrado: true, valores };
  }

  const { data: tarjeta, error: errorTarjeta } = await admin
    .from("tarjetas")
    .insert({
      cafeteria_id: cafeteriaId,
      cliente_id: clienteId,
      programa_id: programa.id,
    })
    .select("codigo")
    .single();

  if (errorTarjeta) {
    if (errorTarjeta.code === "23505") return { error: null, yaRegistrado: true, valores };
    return fallo(`No se pudo crear tu tarjeta: ${errorTarjeta.message}`);
  }

  redirect(`/t/${tarjeta.codigo}?nueva=1`);
}
