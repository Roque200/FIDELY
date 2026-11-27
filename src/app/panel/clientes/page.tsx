import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { filtroBusqueda, formatoFecha, telefonoLegible, uno } from "@/lib/clientes";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

const POR_PAGINA = 25;

type TarjetaResumen = {
  sellos_actuales: number;
  premios_canjeados: number;
  programas: unknown;
};

export default function ClientesPage({ searchParams }: PageProps<"/panel/clientes">) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({
  searchParams,
}: {
  searchParams: PageProps<"/panel/clientes">["searchParams"];
}) {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const pagina = Math.max(1, Math.floor(Number(params.pagina)) || 1);
  const desde = (pagina - 1) * POR_PAGINA;

  const { cafeteriaId } = acceso.perfil;
  const supabase = await createClient();

  let consulta = supabase
    .from("clientes")
    .select(
      "id, nombre, telefono, correo, creado_en, tarjetas ( sellos_actuales, premios_canjeados, programas ( nombre, sellos_requeridos ) )",
      { count: "exact" },
    )
    .eq("cafeteria_id", cafeteriaId);
  consulta = consulta.order("creado_en", { referencedTable: "tarjetas" });
  const filtro = filtroBusqueda(q);
  if (filtro) consulta = consulta.or(filtro);

  const [clientesRes, cafeteriaRes] = await Promise.all([
    consulta
      .order("creado_en", { ascending: false })
      .order("id")
      .range(desde, desde + POR_PAGINA - 1),
    supabase.from("cafeterias").select("zona_horaria").eq("id", cafeteriaId).single(),
  ]);

  // Página fuera de rango: PostgREST responde con error, se muestra vacía
  const fueraDeRango = clientesRes.error?.code === "PGRST103";
  if (clientesRes.error && !fueraDeRango) {
    throw new Error(`No se pudieron leer los clientes: ${clientesRes.error.message}`);
  }
  if (cafeteriaRes.error) {
    throw new Error(`No se pudo leer la cafetería: ${cafeteriaRes.error.message}`);
  }

  const clientes = clientesRes.data ?? [];
  const total = clientesRes.count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const fecha = formatoFecha(cafeteriaRes.data.zona_horaria as string, false);

  const enlacePagina = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (n > 1) p.set("pagina", String(n));
    const s = p.toString();
    return s ? `/panel/clientes?${s}` : "/panel/clientes";
  };

  return (
    <>
      <CabeceraSeccion
        titulo="Clientes"
        descripcion={
          q
            ? `${total} resultado${total === 1 ? "" : "s"} para "${q}"`
            : `${total} cliente${total === 1 ? "" : "s"} registrado${total === 1 ? "" : "s"}`
        }
      />

      <form action="/panel/clientes" className="flex gap-2 border-b border-stone-200 px-4 py-3 md:px-6">
        <label className="relative flex-1">
          <span className="sr-only">Buscar cliente</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            key={q}
            type="search"
            name="q"
            defaultValue={q}
            maxLength={80}
            placeholder="Buscar por nombre, teléfono o correo"
            className="block w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-800"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          Buscar
        </button>
      </form>

      {clientes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-900/10 text-amber-900">
            <Users className="h-7 w-7" />
          </span>
          <p className="text-lg font-medium text-stone-900">
            {q || fueraDeRango ? "No se encontraron clientes" : "Aún no tienes clientes"}
          </p>
          <p className="max-w-sm text-sm text-stone-500">
            {q
              ? "Revisa cómo lo escribiste o busca por su teléfono o correo."
              : "Cuando tus clientes se registren con el QR de tu cafetería, aparecerán aquí."}
          </p>
          {(q || fueraDeRango) && (
            <Link href="/panel/clientes" className="text-sm font-medium text-amber-900 hover:underline">
              Ver todos los clientes
            </Link>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {clientes.map((c) => {
            const tarjetas = (c.tarjetas ?? []) as TarjetaResumen[];
            const contacto = [telefonoLegible(c.telefono), c.correo].filter(Boolean).join(" · ");
            return (
              <li key={c.id}>
                <Link
                  href={`/panel/clientes/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 md:px-6"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-900/10 font-semibold text-amber-900">
                    {c.nombre.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-stone-900">{c.nombre}</p>
                    <p className="truncate text-sm text-stone-500">{contacto}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {tarjetas.map((t, i) => {
                        const programa = uno<{ nombre: string; sellos_requeridos: number }>(t.programas);
                        return (
                          <span
                            key={i}
                            className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                          >
                            {programa?.nombre}: {t.sellos_actuales}/{programa?.sellos_requeridos}
                            {t.premios_canjeados > 0 &&
                              ` · ${t.premios_canjeados} premio${t.premios_canjeados === 1 ? "" : "s"}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <span className="hidden shrink-0 text-xs text-stone-400 sm:block">
                    Desde {fecha.format(new Date(c.creado_en))}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {paginas > 1 && (
        <nav className="flex items-center justify-between border-t border-stone-200 px-4 py-3 text-sm md:px-6">
          {pagina > 1 ? (
            <Link href={enlacePagina(pagina - 1)} className="flex items-center gap-1 text-stone-600 hover:text-stone-900">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-stone-500">
            Página {Math.min(pagina, paginas)} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={enlacePagina(pagina + 1)} className="flex items-center gap-1 text-stone-600 hover:text-stone-900">
              Siguiente <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
