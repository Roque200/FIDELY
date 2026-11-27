import { Suspense } from "react";
import { CreditCard, TriangleAlert } from "lucide-react";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { BotonAgregar } from "@/components/panel/boton-agregar";
import { EstadoPill } from "@/components/panel/estado-pill";
import { TarjetaWallet } from "@/components/panel/tarjeta-wallet";

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

export default function PanelPage() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido />
    </Suspense>
  );
}

// Lee la sesión (por eso va dentro de Suspense).
// Si no tiene acceso no muestra nada: el layout lo redirige.
async function Contenido() {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  const { cafeteriaId } = acceso.perfil;
  const supabase = await createClient();

  // RLS ya limita a su cafetería; el filtro es para que la consulta sea explícita
  const [cafeteriaRes, programasRes] = await Promise.all([
    supabase
      .from("cafeterias")
      .select(
        "nombre, logo_url, color_fondo, color_texto, color_etiquetas, max_programas",
      )
      .eq("id", cafeteriaId)
      .single(),
    supabase
      .from("programas")
      .select("id, nombre, premio, sellos_requeridos, activo")
      .eq("cafeteria_id", cafeteriaId)
      .order("activo", { ascending: false })
      .order("creado_en", { ascending: true }),
  ]);

  if (cafeteriaRes.error) {
    throw new Error(`No se pudo leer la cafetería: ${cafeteriaRes.error.message}`);
  }
  if (programasRes.error) {
    throw new Error(`No se pudieron leer los programas: ${programasRes.error.message}`);
  }

  const cafeteria = cafeteriaRes.data;
  const programas = programasRes.data;
  const activos = programas.filter((p) => p.activo).length;
  const maximo = cafeteria.max_programas as number;

  return (
    <>
      <CabeceraSeccion
        titulo="Tarjetas"
        descripcion={`${activos} programa${activos === 1 ? "" : "s"} activo${activos === 1 ? "" : "s"} · tu plan permite ${maximo}`}
        accion={<BotonAgregar pronto />}
      />

      {activos > maximo && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200 md:mx-6">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Tienes más programas activos de los que permite tu plan. Los que ya
            están activos siguen funcionando, pero no podrás activar otro hasta
            desactivar alguno.
          </p>
        </div>
      )}

      {programas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-900/10 text-amber-900">
            <CreditCard className="h-7 w-7" />
          </span>
          <p className="text-lg font-medium text-stone-900">
            Aún no tienes tarjetas
          </p>
          <p className="max-w-sm text-sm text-stone-500">
            Crea tu programa de lealtad (por ejemplo, &quot;compra 9 y el 10 es
            gratis&quot;) para que tus clientes guarden su tarjeta en Wallet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-6 p-4 md:p-6">
          {programas.map((programa) => (
            <div key={programa.id} className="flex flex-col items-center gap-3">
              <div
                className={`w-full max-w-[300px] ${programa.activo ? "" : "opacity-60"}`}
              >
                <TarjetaWallet
                  cafeteria={cafeteria}
                  programa={programa}
                  valorQr={`fidely:vista-previa:${programa.id}`}
                />
              </div>
              <EstadoPill
                texto={programa.activo ? "Activo" : "Inactivo"}
                tono={programa.activo ? "verde" : "gris"}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
