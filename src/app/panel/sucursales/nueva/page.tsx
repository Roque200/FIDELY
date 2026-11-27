import { Suspense } from "react";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { FormularioSucursal } from "../formulario-sucursal";

export const instant = false;

export default function NuevaSucursalPage() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  // Para que el formulario empiece de cero después de crear una
  // (Next guarda en memoria las páginas visitadas)
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("sucursales")
    .select("id", { count: "exact", head: true })
    .eq("cafeteria_id", acceso.perfil.cafeteriaId);
  if (error) throw new Error(`No se pudieron contar las sucursales: ${error.message}`);

  return (
    <>
      <CabeceraSeccion
        titulo="Nueva sucursal"
        regreso={{ href: "/panel/sucursales", texto: "Sucursales" }}
      />
      <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
        <FormularioSucursal key={count ?? 0} />
      </div>
    </>
  );
}
