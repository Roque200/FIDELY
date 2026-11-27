import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tieneContrasena } from "@/lib/invitaciones";
import { PantallaCarga } from "@/components/pantalla-carga";
import { EstadoPill } from "@/components/panel/estado-pill";
import { FormularioEdicion } from "./formulario-edicion";
import { BotonNuevoLink } from "./boton-nuevo-link";

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

export default function CafeteriaPage({
  params,
}: PageProps<"/admin/cafeterias/[id]">) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({
  params,
}: {
  params: PageProps<"/admin/cafeterias/[id]">["params"];
}) {
  const acceso = await verificarAcceso("admin");
  if (!acceso.permitido) return null;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  // Lecturas con la sesión del admin (RLS le deja ver todo)
  const supabase = await createClient();
  const [cafeteriaRes, duenosRes, programasRes] = await Promise.all([
    supabase
      .from("cafeterias")
      .select("id, nombre, slug, zona_horaria, plan, estado_suscripcion, max_programas, actualizado_en")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("staff")
      .select("id, nombre, activo")
      .eq("cafeteria_id", id)
      .eq("rol", "dueno")
      .order("creado_en"),
    supabase
      .from("programas")
      .select("id", { count: "exact", head: true })
      .eq("cafeteria_id", id)
      .eq("activo", true),
  ]);

  if (cafeteriaRes.error) {
    throw new Error(`No se pudo leer la cafetería: ${cafeteriaRes.error.message}`);
  }
  if (!cafeteriaRes.data) notFound();
  if (duenosRes.error) {
    throw new Error(`No se pudieron leer los dueños: ${duenosRes.error.message}`);
  }

  const cafeteria = cafeteriaRes.data;
  const programasActivos = programasRes.count ?? 0;

  // Estado de la cuenta de cada dueño (correo e invitación) desde Auth
  const admin = createAdminClient();
  const duenos = await Promise.all(
    duenosRes.data.map(async (d) => {
      const { data } = await admin.auth.admin.getUserById(d.id as string);
      return {
        id: d.id as string,
        nombre: d.nombre as string,
        activo: d.activo as boolean,
        correo: data.user?.email ?? "—",
        pendiente: !tieneContrasena(data.user),
      };
    }),
  );

  return (
    <>
      <div className="border-b border-stone-200 px-4 py-4 md:px-6">
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Cafeterías
        </Link>
        <h1 className="text-xl font-semibold text-stone-900">{cafeteria.nombre}</h1>
        <p className="mt-0.5 font-mono text-sm text-stone-500">/c/{cafeteria.slug}</p>
      </div>

      <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-xl p-4 ring-1 ring-stone-200 md:p-5">
          <h2 className="font-semibold text-stone-900">Plan y límites</h2>
          <p className="mb-4 text-sm text-stone-500">
            Tiene {programasActivos} programa{programasActivos === 1 ? "" : "s"} activo
            {programasActivos === 1 ? "" : "s"} de {cafeteria.max_programas} permitido
            {cafeteria.max_programas === 1 ? "" : "s"}.
          </p>
          <FormularioEdicion key={cafeteria.actualizado_en} cafeteria={cafeteria} />
        </section>

        <section className="space-y-4 rounded-xl p-4 ring-1 ring-stone-200 md:p-5">
          <h2 className="font-semibold text-stone-900">Dueño</h2>

          {duenos.length === 0 && (
            <p className="text-sm text-stone-500">
              Esta cafetería no tiene dueño asignado.
            </p>
          )}

          {duenos.map((d) => (
            <div key={d.id} className="space-y-3 border-t border-stone-100 pt-4 first:border-0 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{d.nombre}</p>
                  <p className="truncate text-sm text-stone-500">{d.correo}</p>
                </div>
                {!d.activo ? (
                  <EstadoPill texto="Desactivado" tono="gris" />
                ) : d.pendiente ? (
                  <EstadoPill texto="Invitación pendiente" tono="ambar" />
                ) : (
                  <EstadoPill texto="Activo" tono="verde" />
                )}
              </div>
              {d.pendiente && d.activo && (
                <BotonNuevoLink
                  staffId={d.id}
                  dueno={d.nombre}
                  cafeteria={cafeteria.nombre}
                />
              )}
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
