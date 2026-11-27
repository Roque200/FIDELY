import { Suspense } from "react";
import { Store } from "lucide-react";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { BotonAgregar } from "@/components/panel/boton-agregar";
import { EstadoPill } from "@/components/panel/estado-pill";

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

const ESTADOS = {
  prueba: { texto: "Prueba", tono: "ambar" },
  activa: { texto: "Activa", tono: "verde" },
  vencida: { texto: "Vencida", tono: "rojo" },
  cancelada: { texto: "Cancelada", tono: "gris" },
} as const;

type EstadoSuscripcion = keyof typeof ESTADOS;

export default function AdminPage() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido />
    </Suspense>
  );
}

// Lee la sesión (por eso va dentro de Suspense).
// Si no tiene acceso no muestra nada: el layout lo redirige.
async function Contenido() {
  const acceso = await verificarAcceso("admin");
  if (!acceso.permitido) return null;

  const supabase = await createClient();
  const { data: cafeterias, error } = await supabase
    .from("cafeterias")
    .select(
      "id, nombre, slug, plan, estado_suscripcion, max_programas, color_fondo",
    )
    .order("creado_en", { ascending: false });

  if (error) {
    throw new Error(`No se pudieron leer las cafeterías: ${error.message}`);
  }

  return (
    <>
      <CabeceraSeccion
        titulo="Cafeterías"
        descripcion={`${cafeterias.length} registrada${cafeterias.length === 1 ? "" : "s"}`}
        accion={<BotonAgregar pronto />}
      />

      {cafeterias.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-900/10 text-amber-900">
            <Store className="h-7 w-7" />
          </span>
          <p className="text-lg font-medium text-stone-900">
            Aún no hay cafeterías
          </p>
          <p className="max-w-sm text-sm text-stone-500">
            Cuando des de alta la primera, aparecerá aquí con su plan y su
            estado.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium md:px-6">Cafetería</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Programas máx.</th>
                <th className="px-4 py-3 font-medium md:px-6">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {cafeterias.map((c) => {
                const estado =
                  ESTADOS[c.estado_suscripcion as EstadoSuscripcion];
                return (
                  <tr key={c.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 md:px-6">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-stone-200"
                          style={{ backgroundColor: c.color_fondo }}
                        />
                        <span className="font-medium text-stone-900">
                          {c.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-stone-600">
                      /c/{c.slug}
                    </td>
                    <td className="px-4 py-3 capitalize text-stone-600">
                      {c.plan}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {c.max_programas}
                    </td>
                    <td className="px-4 py-3 md:px-6">
                      <EstadoPill texto={estado.texto} tono={estado.tono} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
