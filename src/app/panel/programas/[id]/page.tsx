import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { generarCodigoSvg } from "@/lib/codigos";
import { disenoEfectivo } from "@/lib/diseno";
import { Pestanas } from "./pestanas";
import { FormularioPrograma } from "../formulario-programa";
import { datosCafeteria } from "../datos";

export const metadata: Metadata = {
  title: "Editar programa",
};

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

export default function EditarProgramaPage({
  params,
}: PageProps<"/panel/programas/[id]">) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({
  params,
}: {
  params: PageProps<"/panel/programas/[id]">["params"];
}) {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  // RLS solo deja ver los programas de su cafetería
  const supabase = await createClient();
  const [programaRes, tarjetasRes] = await Promise.all([
    supabase
      .from("programas")
      .select("id, nombre, descripcion, sellos_requeridos, premio, max_sellos_por_dia, activo, actualizado_en, logo_horizontal_url, logo_cuadrado_url, color_fondo, color_etiquetas, color_texto, icono_sello, icono_sello_url, icono_sello_inactivo, icono_sello_inactivo_url, color_sello_activo, color_sello_inactivo, color_fondo_sello, tipo_codigo")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("tarjetas")
      .select("id", { count: "exact", head: true })
      .eq("programa_id", id),
  ]);

  if (programaRes.error) {
    throw new Error(`No se pudo leer el programa: ${programaRes.error.message}`);
  }
  if (!programaRes.data) notFound();
  if (tarjetasRes.error) {
    throw new Error(`No se pudieron contar las tarjetas: ${tarjetasRes.error.message}`);
  }

  const programa = programaRes.data;
  const { diseno, maximo, activosOtros } = await datosCafeteria(
    acceso.perfil.cafeteriaId,
    programa.id,
  );
  const d = disenoEfectivo(diseno, programa);

  return (
    <>
      <CabeceraSeccion
        titulo={programa.nombre}
        descripcion="Editar programa"
        regreso={{ href: "/panel", texto: "Tarjetas" }}
      />
      <Pestanas programaId={programa.id} activa="informacion" />
      {/* key: si el programa se guardó, el formulario muestra lo nuevo */}
      <FormularioPrograma
        key={`${programa.actualizado_en}-${activosOtros}-${maximo}`}
        programa={programa}
        diseno={d}
        codigo={generarCodigoSvg(d.tipoCodigo, `fidely:vista-previa:${programa.id}`)}
        activosOtros={activosOtros}
        maximo={maximo}
        tarjetas={tarjetasRes.count ?? 0}
      />
    </>
  );
}
