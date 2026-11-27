import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { BotonAgregar } from "@/components/panel/boton-agregar";
import { EstadoPill } from "@/components/panel/estado-pill";

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

export default function SucursalesPage() {
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
  const [sucursalesRes, staffRes] = await Promise.all([
    supabase
      .from("sucursales")
      .select("id, nombre, direccion, activa")
      .eq("cafeteria_id", cafeteriaId)
      .order("activa", { ascending: false })
      .order("nombre"),
    supabase
      .from("staff")
      .select("sucursal_id")
      .eq("cafeteria_id", cafeteriaId)
      .eq("rol", "barista")
      .eq("activo", true),
  ]);
  if (sucursalesRes.error) {
    throw new Error(`No se pudieron leer las sucursales: ${sucursalesRes.error.message}`);
  }
  if (staffRes.error) {
    throw new Error(`No se pudo leer el personal: ${staffRes.error.message}`);
  }

  const sucursales = sucursalesRes.data;
  const baristas = new Map<string, number>();
  for (const s of staffRes.data) {
    if (s.sucursal_id) baristas.set(s.sucursal_id, (baristas.get(s.sucursal_id) ?? 0) + 1);
  }
  const activas = sucursales.filter((s) => s.activa).length;

  return (
    <>
      <CabeceraSeccion
        titulo="Sucursales"
        descripcion={`${activas} sucursal${activas === 1 ? "" : "es"} activa${activas === 1 ? "" : "s"}`}
        accion={<BotonAgregar href="/panel/sucursales/nueva" />}
      />

      {sucursales.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-900/10 text-amber-900">
            <MapPin className="h-7 w-7" />
          </span>
          <p className="text-lg font-medium text-stone-900">Aún no tienes sucursales</p>
          <p className="max-w-sm text-sm text-stone-500">
            Agrega tus sucursales para saber dónde se dio cada sello y asignarles
            a tus baristas.
          </p>
          <Link
            href="/panel/sucursales/nueva"
            className="mt-2 rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-800"
          >
            Agregar mi primera sucursal
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {sucursales.map((s) => {
            const n = baristas.get(s.id) ?? 0;
            return (
              <li key={s.id}>
                <Link
                  href={`/panel/sucursales/${s.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-stone-50 md:px-6 ${s.activa ? "" : "opacity-60"}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-900/10 text-amber-900">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-stone-900">{s.nombre}</p>
                    <p className="truncate text-sm text-stone-500">
                      {[s.direccion, `${n} barista${n === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <EstadoPill texto={s.activa ? "Activa" : "Desactivada"} tono={s.activa ? "verde" : "gris"} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
