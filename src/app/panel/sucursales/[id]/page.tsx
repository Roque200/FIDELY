import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { EstadoPill } from "@/components/panel/estado-pill";
import { FormularioSucursal } from "../formulario-sucursal";
import { BotonEstadoSucursal } from "../boton-estado";

export const instant = false;

export default function SucursalPage({ params }: PageProps<"/panel/sucursales/[id]">) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: PageProps<"/panel/sucursales/[id]">["params"] }) {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const { cafeteriaId } = acceso.perfil;
  const supabase = await createClient();
  const [sucursalRes, staffRes] = await Promise.all([
    supabase
      .from("sucursales")
      .select("id, nombre, direccion, activa")
      .eq("id", id)
      .eq("cafeteria_id", cafeteriaId)
      .maybeSingle(),
    supabase
      .from("staff")
      .select("id, nombre, activo")
      .eq("cafeteria_id", cafeteriaId)
      .eq("sucursal_id", id)
      .eq("rol", "barista")
      .order("activo", { ascending: false })
      .order("nombre"),
  ]);
  if (sucursalRes.error) throw new Error(`No se pudo leer la sucursal: ${sucursalRes.error.message}`);
  if (staffRes.error) throw new Error(`No se pudo leer el personal: ${staffRes.error.message}`);
  const sucursal = sucursalRes.data;
  if (!sucursal) notFound();

  return (
    <>
      <CabeceraSeccion
        titulo={sucursal.nombre}
        descripcion={sucursal.activa ? "Activa" : "Desactivada: los baristas no pueden sellar desde aquí"}
        regreso={{ href: "/panel/sucursales", texto: "Sucursales" }}
      />
      <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-xl p-4 ring-1 ring-stone-200 md:p-5">
          <h2 className="mb-4 font-semibold text-stone-900">Datos</h2>
          <FormularioSucursal
            key={`${sucursal.nombre}|${sucursal.direccion ?? ""}`}
            sucursal={sucursal}
          />
        </section>

        <div className="space-y-6">
          <section className="space-y-3 rounded-xl p-4 ring-1 ring-stone-200 md:p-5">
            <h2 className="font-semibold text-stone-900">Baristas asignados</h2>
            {staffRes.data.length === 0 ? (
              <p className="text-sm text-stone-500">Ningún barista tiene esta sucursal.</p>
            ) : (
              <ul className="space-y-2">
                {staffRes.data.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/panel/usuarios/${b.id}`} className="text-stone-800 hover:text-amber-900 hover:underline">
                      {b.nombre}
                    </Link>
                    {!b.activo && <EstadoPill texto="Desactivado" tono="gris" />}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-xl p-4 ring-1 ring-stone-200 md:p-5">
            <h2 className="font-semibold text-stone-900">Estado</h2>
            <p className="text-sm text-stone-500">
              {sucursal.activa
                ? "Si la desactivas ya no se podrá sellar ni canjear desde aquí. El historial se conserva y puedes reactivarla cuando quieras."
                : "Está desactivada. Al reactivarla se podrá volver a asignar a tus baristas."}
            </p>
            <BotonEstadoSucursal key={String(sucursal.activa)} id={sucursal.id} activa={sucursal.activa} />
          </section>
        </div>
      </div>
    </>
  );
}
