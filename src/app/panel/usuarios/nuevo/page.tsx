import { Suspense } from "react";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { leerSucursales } from "../datos";
import { FormularioBarista } from "./formulario-barista";

export const instant = false;

export default function NuevoBaristaPage() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  const { cafeteriaId } = acceso.perfil;
  const supabase = await createClient();
  const [cafeteriaRes, staffRes, sucursales] = await Promise.all([
    supabase.from("cafeterias").select("nombre").eq("id", cafeteriaId).single(),
    // Para que el formulario empiece de cero después de invitar a alguien
    // (Next guarda en memoria las páginas visitadas)
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("cafeteria_id", cafeteriaId),
    leerSucursales(cafeteriaId),
  ]);
  if (cafeteriaRes.error) throw new Error(`No se pudo leer la cafetería: ${cafeteriaRes.error.message}`);
  if (staffRes.error) throw new Error(`No se pudo leer el personal: ${staffRes.error.message}`);

  return (
    <>
      <CabeceraSeccion
        titulo="Invitar barista"
        descripcion="Se crea su cuenta y te damos un link para que cree su contraseña."
        regreso={{ href: "/panel/usuarios", texto: "Usuarios" }}
      />
      <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
        <FormularioBarista
          key={`${staffRes.count ?? 0}|${sucursales.map((s) => `${s.id}${s.activa}`).join()}`}
          cafeteria={cafeteriaRes.data.nombre}
          sucursales={sucursales}
        />
      </div>
    </>
  );
}
