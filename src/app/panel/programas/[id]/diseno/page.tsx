import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { disenoEfectivo } from "@/lib/diseno";
import { generarTodosLosCodigos } from "@/lib/codigos";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { Pestanas } from "../pestanas";
import { datosCafeteria } from "../../datos";
import { FormularioDiseno } from "./formulario-diseno";

export const metadata: Metadata = {
  title: "Diseño de la tarjeta",
};

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

export default function DisenoPage({
  params,
  searchParams,
}: PageProps<"/panel/programas/[id]/diseno">) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({
  params,
  searchParams,
}: {
  params: PageProps<"/panel/programas/[id]/diseno">["params"];
  searchParams: PageProps<"/panel/programas/[id]/diseno">["searchParams"];
}) {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { nuevo } = await searchParams;

  // RLS solo deja ver los programas de su cafetería
  const supabase = await createClient();
  const { data: programa, error } = await supabase
    .from("programas")
    .select(
      "id, nombre, premio, sellos_requeridos, actualizado_en, logo_horizontal_url, logo_cuadrado_url, color_fondo, color_etiquetas, color_texto, icono_sello, icono_sello_url, icono_sello_inactivo, icono_sello_inactivo_url, color_sello_activo, color_sello_inactivo, color_fondo_sello, tipo_codigo",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el programa: ${error.message}`);
  if (!programa) notFound();

  const { diseno: cafeteria } = await datosCafeteria(acceso.perfil.cafeteriaId);
  const d = disenoEfectivo(cafeteria, programa);

  return (
    <>
      <CabeceraSeccion
        titulo={programa.nombre}
        descripcion="Personaliza cómo se ve la tarjeta en la cartera de tus clientes."
        regreso={{ href: "/panel", texto: "Tarjetas" }}
      />
      <Pestanas programaId={programa.id} activa="diseno" />

      {nuevo === "1" && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200 md:mx-6">
          <PartyPopper className="mt-0.5 h-4 w-4 shrink-0" />
          <p>¡Programa creado! Ahora dale el estilo de tu cafetería a la tarjeta.</p>
        </div>
      )}

      <FormularioDiseno
        programaId={programa.id}
        cafeteriaId={acceso.perfil.cafeteriaId}
        nombreCafeteria={cafeteria.nombre}
        programa={programa}
        codigos={generarTodosLosCodigos(`fidely:vista-previa:${programa.id}`)}
        version={programa.actualizado_en}
        guardado={{
          // Los logos son solo los del programa (los de la cafetería no se copian)
          logo_horizontal_url: programa.logo_horizontal_url ?? "",
          logo_cuadrado_url: programa.logo_cuadrado_url ?? "",
          color_fondo: d.colorFondo.toUpperCase(),
          color_etiquetas: d.colorEtiquetas.toUpperCase(),
          color_texto: d.colorTexto.toUpperCase(),
          icono_sello: d.iconoSello,
          icono_sello_url: d.iconoSelloUrl ?? "",
          icono_sello_inactivo: d.iconoSelloInactivo,
          icono_sello_inactivo_url: d.iconoSelloInactivoUrl ?? "",
          color_sello_activo: d.colorSelloActivo.toUpperCase(),
          color_sello_inactivo: d.colorSelloInactivo.toUpperCase(),
          color_fondo_sello: d.colorFondoSello.toUpperCase(),
          tipo_codigo: d.tipoCodigo,
        }}
      />
    </>
  );
}
