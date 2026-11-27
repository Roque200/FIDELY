"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ValoresSucursal = {
  nombre: string;
  direccion: string;
};

export type EstadoSucursal = {
  error: string | null;
  valores: ValoresSucursal | null;
};

const ID_REGEX = /^[0-9a-f-]{36}$/;

function texto(fd: FormData, campo: string) {
  return String(fd.get(campo) ?? "").trim();
}

// Crea o edita una sucursal de la cafetería del dueño.
// Se guarda con la sesión del dueño: RLS impide tocar las de otra cafetería.
export async function guardarSucursal(
  _anterior: EstadoSucursal,
  fd: FormData,
): Promise<EstadoSucursal> {
  const id = texto(fd, "id");
  const valores: ValoresSucursal = {
    nombre: texto(fd, "nombre").replace(/\s+/g, " "),
    direccion: texto(fd, "direccion"),
  };
  const fallo = (error: string): EstadoSucursal => ({ error, valores });

  const perfil = await getPerfil();
  if (perfil?.tipo !== "dueno") return fallo("No autorizado.");

  if (id && !ID_REGEX.test(id)) return fallo("Sucursal no válida.");
  if (valores.nombre.length < 2 || valores.nombre.length > 60) {
    return fallo("El nombre debe tener entre 2 y 60 caracteres.");
  }
  if (valores.direccion.length > 200) {
    return fallo("La dirección puede tener hasta 200 caracteres.");
  }

  const supabase = await createClient();

  // Que no haya dos sucursales con el mismo nombre (el barista la ve por nombre)
  const { data: todas, error: errorTodas } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("cafeteria_id", perfil.cafeteriaId);
  if (errorTodas) return fallo(`No se pudo guardar: ${errorTodas.message}`);
  const comparable = (v: string) => v.toLocaleLowerCase("es-MX");
  if (todas.some((s) => s.id !== id && comparable(s.nombre) === comparable(valores.nombre))) {
    return fallo(`Ya tienes una sucursal llamada "${valores.nombre}".`);
  }

  const datos = { nombre: valores.nombre, direccion: valores.direccion || null };

  if (id) {
    const { data, error } = await supabase
      .from("sucursales")
      .update(datos)
      .eq("id", id)
      .eq("cafeteria_id", perfil.cafeteriaId)
      .select("id");
    if (error) return fallo(`No se pudo guardar: ${error.message}`);
    if (!data || data.length === 0) return fallo("La sucursal ya no existe.");
  } else {
    const { error } = await supabase
      .from("sucursales")
      .insert({ ...datos, cafeteria_id: perfil.cafeteriaId });
    if (error) return fallo(`No se pudo crear la sucursal: ${error.message}`);
  }

  redirect("/panel/sucursales");
}

export type EstadoActivar = { error: string | null };

// Desactiva o reactiva una sucursal. No se desactiva si tiene baristas
// activos asignados: ya no podrían sellar desde ahí.
export async function cambiarEstadoSucursal(
  _anterior: EstadoActivar,
  fd: FormData,
): Promise<EstadoActivar> {
  const id = texto(fd, "id");
  const activa = fd.get("activa") === "1";

  const perfil = await getPerfil();
  if (perfil?.tipo !== "dueno") return { error: "No autorizado." };
  if (!ID_REGEX.test(id)) return { error: "Sucursal no válida." };

  const supabase = await createClient();

  if (!activa) {
    const { data: asignados, error } = await supabase
      .from("staff")
      .select("nombre")
      .eq("cafeteria_id", perfil.cafeteriaId)
      .eq("sucursal_id", id)
      .eq("rol", "barista")
      .eq("activo", true)
      .order("nombre");
    if (error) return { error: `No se pudo revisar el personal: ${error.message}` };
    if (asignados.length > 0) {
      const nombres = asignados.map((s) => s.nombre).join(", ");
      return {
        error: `No se puede desactivar: ${asignados.length === 1 ? "este barista la tiene" : "estos baristas la tienen"} asignada (${nombres}). Cámbiales la sucursal o desactívalos primero.`,
      };
    }
  }

  const { data, error } = await supabase
    .from("sucursales")
    .update({ activa })
    .eq("id", id)
    .eq("cafeteria_id", perfil.cafeteriaId)
    .select("id");
  if (error) return { error: `No se pudo guardar: ${error.message}` };
  if (!data || data.length === 0) return { error: "La sucursal ya no existe." };

  refresh();
  return { error: null };
}
