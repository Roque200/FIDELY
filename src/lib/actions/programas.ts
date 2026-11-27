"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { actualizarProgramaGoogle } from "@/lib/google-wallet";
import { origenActual } from "@/lib/origen";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ValoresPrograma = {
  nombre: string;
  descripcion: string;
  sellos_requeridos: string;
  premio: string;
  max_sellos_por_dia: string;
  activo: boolean;
};

export type EstadoPrograma = {
  error: string | null;
  valores: ValoresPrograma | null;
};

function texto(fd: FormData, campo: string) {
  return String(fd.get(campo) ?? "").trim();
}

function enteroValido(valor: string, min: number, max: number) {
  if (!/^\d+$/.test(valor)) return null;
  const n = Number(valor);
  return n >= min && n <= max ? n : null;
}

// Crea o edita un programa de lealtad de la cafetería del dueño.
// Se guarda con la sesión del dueño: RLS y los permisos de columnas
// impiden tocar programas de otra cafetería o el google_class_id,
// y el trigger de la base valida el límite de programas activos.
export async function guardarPrograma(
  _anterior: EstadoPrograma,
  fd: FormData,
): Promise<EstadoPrograma> {
  const id = texto(fd, "id");
  const valores: ValoresPrograma = {
    nombre: texto(fd, "nombre"),
    descripcion: texto(fd, "descripcion"),
    sellos_requeridos: texto(fd, "sellos_requeridos"),
    premio: texto(fd, "premio"),
    max_sellos_por_dia: texto(fd, "max_sellos_por_dia"),
    activo: fd.get("activo") === "1",
  };
  const fallo = (error: string): EstadoPrograma => ({ error, valores });

  const perfil = await getPerfil();
  if (perfil?.tipo !== "dueno") return fallo("No autorizado.");

  if (id && !/^[0-9a-f-]{36}$/.test(id)) return fallo("Programa no válido.");
  if (valores.nombre.length < 2 || valores.nombre.length > 60) {
    return fallo("El nombre debe tener entre 2 y 60 caracteres.");
  }
  if (valores.descripcion.length > 200) {
    return fallo("La descripción puede tener máximo 200 caracteres.");
  }
  const sellos = enteroValido(valores.sellos_requeridos, 1, 50);
  if (sellos === null) {
    return fallo("Los sellos para el premio deben ser un número entre 1 y 50.");
  }
  if (valores.premio.length < 2 || valores.premio.length > 60) {
    return fallo("El premio debe tener entre 2 y 60 caracteres.");
  }
  const maxDia = enteroValido(valores.max_sellos_por_dia, 1, 20);
  if (maxDia === null) {
    return fallo("Los sellos por día deben ser un número entre 1 y 20.");
  }

  const datos = {
    nombre: valores.nombre,
    descripcion: valores.descripcion || null,
    sellos_requeridos: sellos,
    premio: valores.premio,
    max_sellos_por_dia: maxDia,
    activo: valores.activo,
  };

  const supabase = await createClient();

  const { data, error } = id
    ? await supabase.from("programas").update(datos).eq("id", id).select("id")
    : await supabase
        .from("programas")
        .insert({ ...datos, cafeteria_id: perfil.cafeteriaId })
        .select("id");

  if (error) {
    // Límite de programas activos (trigger tg_limite_programas)
    if (error.code === "23514" && error.message.startsWith("Tu plan permite")) {
      return fallo(
        `${error.message} Puedes guardarlo como inactivo mientras tanto.`,
      );
    }
    if (error.code === "42501") {
      return fallo("No tienes permiso para hacer este cambio.");
    }
    return fallo(`No se pudo guardar el programa: ${error.message}`);
  }
  if (!data || data.length === 0) {
    return fallo("El programa no existe o no es de tu cafetería.");
  }

  // Las tarjetas ya guardadas en Google Wallet se actualizan después de responder
  if (id) {
    const origen = await origenActual();
    after(() => actualizarProgramaGoogle(id, origen));
  }

  // Programa nuevo: sigue el diseño de su tarjeta. Edición: de regreso a la lista.
  redirect(id ? "/panel" : `/panel/programas/${data[0].id}/diseno?nuevo=1`);
}
