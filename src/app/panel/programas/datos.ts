import "server-only";
import { createClient } from "@/lib/supabase/server";

// Diseño de la cafetería y cuántos programas activos tiene (sin contar uno)
export async function datosCafeteria(cafeteriaId: string, excluirPrograma?: string) {
  const supabase = await createClient();

  let consultaActivos = supabase
    .from("programas")
    .select("id", { count: "exact", head: true })
    .eq("cafeteria_id", cafeteriaId)
    .eq("activo", true);
  if (excluirPrograma) {
    consultaActivos = consultaActivos.neq("id", excluirPrograma);
  }

  const [cafeteriaRes, activosRes, totalRes] = await Promise.all([
    supabase
      .from("cafeterias")
      .select("nombre, logo_url, color_fondo, color_texto, color_etiquetas, max_programas")
      .eq("id", cafeteriaId)
      .single(),
    consultaActivos,
    supabase
      .from("programas")
      .select("id", { count: "exact", head: true })
      .eq("cafeteria_id", cafeteriaId),
  ]);

  if (cafeteriaRes.error) {
    throw new Error(`No se pudo leer la cafetería: ${cafeteriaRes.error.message}`);
  }
  if (activosRes.error || totalRes.error) {
    throw new Error(`No se pudieron contar los programas: ${(activosRes.error ?? totalRes.error)?.message}`);
  }

  const { max_programas, ...diseno } = cafeteriaRes.data;
  return {
    diseno,
    maximo: max_programas as number,
    activosOtros: activosRes.count ?? 0,
    totalProgramas: totalRes.count ?? 0,
  };
}
