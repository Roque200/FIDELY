import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, UserCog } from "lucide-react";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tieneContrasena } from "@/lib/invitaciones";
import { uno } from "@/lib/clientes";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { BotonAgregar } from "@/components/panel/boton-agregar";
import { EstadoPill } from "@/components/panel/estado-pill";

export const instant = false;

export default function UsuariosPage() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  const { cafeteriaId, userId } = acceso.perfil;
  const supabase = await createClient();
  // RLS ya limita a su cafetería; el filtro es para que la consulta sea explícita
  const { data, error } = await supabase
    .from("staff")
    .select("id, nombre, rol, activo, sucursales ( nombre )")
    .eq("cafeteria_id", cafeteriaId)
    .order("rol")
    .order("activo", { ascending: false })
    .order("nombre");
  if (error) throw new Error(`No se pudo leer el personal: ${error.message}`);

  // Correo y si ya creó su contraseña viven en Auth (solo de su propio personal)
  const admin = createAdminClient();
  const personal = await Promise.all(
    data.map(async (s) => {
      const { data: cuenta } = await admin.auth.admin.getUserById(s.id as string);
      return {
        id: s.id as string,
        nombre: s.nombre as string,
        esDueno: s.rol === "dueno",
        activo: s.activo as boolean,
        sucursal: uno<{ nombre: string }>(s.sucursales)?.nombre ?? null,
        correo: cuenta.user?.email ?? "—",
        pendiente: !tieneContrasena(cuenta.user),
      };
    }),
  );
  const baristas = personal.filter((p) => !p.esDueno && p.activo).length;

  return (
    <>
      <CabeceraSeccion
        titulo="Usuarios"
        descripcion={`${baristas} barista${baristas === 1 ? "" : "s"} activo${baristas === 1 ? "" : "s"}`}
        accion={<BotonAgregar href="/panel/usuarios/nuevo" />}
      />

      <ul className="divide-y divide-stone-100">
        {personal.map((p) => {
          const contenido = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-900/10 font-semibold text-amber-900">
                {p.nombre.trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-stone-900">
                  {p.nombre}
                  {p.id === userId && <span className="font-normal text-stone-400"> (tú)</span>}
                </p>
                <p className="truncate text-sm text-stone-500">
                  {[p.esDueno ? "Dueño" : "Barista", p.correo, p.sucursal].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-1 sm:hidden">
                  <Estado activo={p.activo} pendiente={p.pendiente} />
                </div>
              </div>
              <span className="hidden sm:block">
                <Estado activo={p.activo} pendiente={p.pendiente} />
              </span>
            </>
          );
          return (
            <li key={p.id}>
              {p.esDueno ? (
                <div className="flex items-center gap-3 px-4 py-3 md:px-6">
                  {contenido}
                  <span className="w-4 shrink-0" />
                </div>
              ) : (
                <Link
                  href={`/panel/usuarios/${p.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-stone-50 md:px-6 ${p.activo ? "" : "opacity-60"}`}
                >
                  {contenido}
                  <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {personal.every((p) => p.esDueno) && (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-900/10 text-amber-900">
            <UserCog className="h-7 w-7" />
          </span>
          <p className="text-lg font-medium text-stone-900">Aún no tienes baristas</p>
          <p className="max-w-sm text-sm text-stone-500">
            Invita a tus baristas para que sellen y canjeen desde su celular con
            el escáner.
          </p>
          <Link
            href="/panel/usuarios/nuevo"
            className="mt-2 rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-800"
          >
            Invitar a mi primer barista
          </Link>
        </div>
      )}
    </>
  );
}

function Estado({ activo, pendiente }: { activo: boolean; pendiente: boolean }) {
  if (!activo) return <EstadoPill texto="Desactivado" tono="gris" />;
  if (pendiente) return <EstadoPill texto="Invitación pendiente" tono="ambar" />;
  return <EstadoPill texto="Activo" tono="verde" />;
}
