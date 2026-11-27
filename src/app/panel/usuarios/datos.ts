import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OpcionSucursal } from "./selector-sucursal";

// Sucursales de la cafetería para los selectores (activas primero)
export async function leerSucursales(cafeteriaId: string): Promise<OpcionSucursal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sucursales")
    .select("id, nombre, activa")
    .eq("cafeteria_id", cafeteriaId)
    .order("activa", { ascending: false })
    .order("nombre");
  if (error) throw new Error(`No se pudieron leer las sucursales: ${error.message}`);
  return data as OpcionSucursal[];
}
