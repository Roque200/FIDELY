import { Suspense } from "react";
import { notFound } from "next/navigation";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tieneContrasena } from "@/lib/invitaciones";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { EstadoPill } from "@/components/panel/estado-pill";
import { leerSucursales } from "../datos";
import { BotonEstadoBarista, BotonLinkBarista, FormularioEditarBarista } from "./acciones-barista";

export const instant = false;

export default function BaristaPage({ params }: PageProps<"/panel/usuarios/[id]">) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: PageProps<"/panel/usuarios/[id]">["params"] }) {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const { cafeteriaId } = acceso.perfil;
  const supabase = await createClient();
  const [baristaRes, cafeteriaRes, sucursales] = await Promise.all([
    supabase
      .from("staff")
      .select("id, nombre, activo, sucursal_id")
      .eq("id", id)
      .eq("cafeteria_id", cafeteriaId)
      .eq("rol", "barista")
      .maybeSingle(),
    supabase.from("cafeterias").select("nombre").eq("id", cafeteriaId).single(),
    leerSucursales(cafeteriaId),
  ]);
  if (baristaRes.error) throw new Error(`No se pudo leer al barista: ${baristaRes.error.message}`);
  if (cafeteriaRes.error) throw new Error(`No se pudo leer la cafetería: ${cafeteriaRes.error.message}`);
  const barista = baristaRes.data;
  if (!barista) notFound();

  const { data: cuenta } = await createAdminClient().auth.admin.getUserById(barista.id);
  const pendiente = !tieneContrasena(cuenta.user);

  return (
    <>
      <CabeceraSeccion
        titulo={barista.nombre}
        descripcion={`Barista · ${cuenta.user?.email ?? "—"}`}
        regreso={{ href: "/panel/usuarios", texto: "Usuarios" }}
      />
      <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-xl p-4 ring-1 ring-stone-200 md:p-5">
          <h2 className="mb-4 font-semibold text-stone-900">Datos</h2>
          <FormularioEditarBarista
            barista={barista}
            sucursales={sucursales}
          />
        </section>

        <div className="space-y-6">
          <section className="space-y-3 rounded-xl p-4 ring-1 ring-stone-200 md:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-stone-900">Acceso</h2>
              {!barista.activo ? (
                <EstadoPill texto="Desactivado" tono="gris" />
              ) : pendiente ? (
                <EstadoPill texto="Invitación pendiente" tono="ambar" />
              ) : (
                <EstadoPill texto="Activo" tono="verde" />
              )}
            </div>
            <p className="text-sm text-stone-500">
              {!barista.activo
                ? "Está desactivado: no puede entrar ni sellar. Su historial se conserva."
                : pendiente
                  ? "Todavía no crea su contraseña. Si perdió el link o ya venció, genera uno nuevo."
                  : "Entra al escáner con su correo y contraseña. Si la olvidó, genérale un link para cambiarla."}
            </p>
            {barista.activo && (
              <BotonLinkBarista
                id={barista.id}
                nombre={barista.nombre}
                cafeteria={cafeteriaRes.data.nombre}
                cambio={!pendiente}
              />
            )}
            <BotonEstadoBarista key={String(barista.activo)} id={barista.id} activo={barista.activo} />
          </section>
        </div>
      </div>
    </>
  );
}
