import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Gift, Mail, Phone, Stamp, SlidersHorizontal } from "lucide-react";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatoFecha, telefonoLegible, uno } from "@/lib/clientes";
import { origenActual, origenPublico } from "@/lib/origen";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { EstadoPill } from "@/components/panel/estado-pill";
import { EnviarTarjeta } from "@/components/panel/enviar-tarjeta";

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

const MAX_MOVIMIENTOS = 100;

const PLATAFORMAS = {
  google: "Google Wallet",
  apple: "Apple Wallet",
} as const;

const TIPOS = {
  sello: { texto: "Sello", icono: Stamp, clase: "bg-amber-900/10 text-amber-900" },
  canje: { texto: "Premio canjeado", icono: Gift, clase: "bg-emerald-100 text-emerald-700" },
  ajuste: { texto: "Ajuste", icono: SlidersHorizontal, clase: "bg-stone-100 text-stone-600" },
} as const;

type Programa = { nombre: string; sellos_requeridos: number; premio: string };

export default function ClientePage({ params }: PageProps<"/panel/clientes/[id]">) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: PageProps<"/panel/clientes/[id]">["params"] }) {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const { cafeteriaId } = acceso.perfil;
  const supabase = await createClient();

  const [clienteRes, cafeteriaRes] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "id, nombre, telefono, correo, creado_en, tarjetas ( id, codigo, sellos_actuales, premios_canjeados, plataforma, creado_en, programas ( nombre, sellos_requeridos, premio ) )",
      )
      .eq("id", id)
      .eq("cafeteria_id", cafeteriaId)
      .order("creado_en", { referencedTable: "tarjetas" })
      .maybeSingle(),
    supabase.from("cafeterias").select("nombre, zona_horaria").eq("id", cafeteriaId).single(),
  ]);

  if (clienteRes.error) {
    throw new Error(`No se pudo leer el cliente: ${clienteRes.error.message}`);
  }
  if (cafeteriaRes.error) {
    throw new Error(`No se pudo leer la cafetería: ${cafeteriaRes.error.message}`);
  }
  const cliente = clienteRes.data;
  if (!cliente) notFound();

  const cafeteria = cafeteriaRes.data;
  const tarjetas = (cliente.tarjetas ?? []).map((t) => ({
    ...t,
    programa: uno<Programa>(t.programas),
  }));
  const nombrePrograma = new Map(tarjetas.map((t) => [t.id, t.programa?.nombre ?? ""]));

  const movimientosRes = tarjetas.length
    ? await supabase
        .from("movimientos")
        .select("id, tarjeta_id, tipo, cantidad, creado_en, staff ( nombre ), sucursales ( nombre )")
        .eq("cafeteria_id", cafeteriaId)
        .in("tarjeta_id", tarjetas.map((t) => t.id))
        .order("creado_en", { ascending: false })
        .order("id", { ascending: false })
        .limit(MAX_MOVIMIENTOS)
    : { data: [], error: null };
  if (movimientosRes.error) {
    throw new Error(`No se pudo leer el historial: ${movimientosRes.error.message}`);
  }
  const movimientos = movimientosRes.data ?? [];

  const fecha = formatoFecha(cafeteria.zona_horaria as string);
  const fechaCorta = formatoFecha(cafeteria.zona_horaria as string, false);
  const origen = origenPublico(await origenActual());

  return (
    <>
      <CabeceraSeccion
        titulo={cliente.nombre}
        descripcion={`Cliente desde ${fechaCorta.format(new Date(cliente.creado_en))}`}
        regreso={{ href: "/panel/clientes", texto: "Clientes" }}
      />

      <div className="space-y-6 p-4 md:p-6">
        <section className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-600">
          {cliente.telefono && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-stone-400" />
              {telefonoLegible(cliente.telefono)}
            </span>
          )}
          {cliente.correo && (
            <span className="flex items-center gap-1.5 break-all">
              <Mail className="h-4 w-4 shrink-0 text-stone-400" />
              {cliente.correo}
            </span>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-stone-900">Tarjetas</h2>
          {tarjetas.length === 0 && (
            <p className="text-sm text-stone-500">Este cliente no tiene tarjetas.</p>
          )}
          {tarjetas.map((t) => (
            <div key={t.id} className="space-y-3 rounded-xl p-4 ring-1 ring-stone-200">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-stone-900">{t.programa?.nombre}</p>
                  <p className="text-sm text-stone-500">Premio: {t.programa?.premio}</p>
                </div>
                <EstadoPill
                  texto={t.plataforma ? PLATAFORMAS[t.plataforma as keyof typeof PLATAFORMAS] : "Solo web"}
                  tono={t.plataforma ? "verde" : "gris"}
                />
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-2xl font-semibold text-stone-900">
                    {t.sellos_actuales}
                    <span className="text-base font-normal text-stone-400"> / {t.programa?.sellos_requeridos}</span>
                  </p>
                  <p className="text-stone-500">Sellos</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-stone-900">{t.premios_canjeados}</p>
                  <p className="text-stone-500">Premios canjeados</p>
                </div>
              </div>
              <EnviarTarjeta
                link={`${origen}/t/${t.codigo}`}
                nombre={cliente.nombre}
                telefono={cliente.telefono}
                correo={cliente.correo}
                cafeteria={cafeteria.nombre}
                programa={t.programa?.nombre ?? ""}
              />
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-stone-900">Historial</h2>
          {movimientos.length === 0 ? (
            <p className="text-sm text-stone-500">Todavía no tiene sellos ni canjes.</p>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-xl ring-1 ring-stone-200">
              {movimientos.map((m) => {
                const tipo = TIPOS[m.tipo as keyof typeof TIPOS];
                const Icono = tipo.icono;
                const staff = uno<{ nombre: string }>(m.staff);
                const sucursal = uno<{ nombre: string }>(m.sucursales);
                const detalle = [
                  tarjetas.length > 1 ? nombrePrograma.get(m.tarjeta_id) : null,
                  staff ? `por ${staff.nombre}` : null,
                  sucursal?.nombre,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tipo.clase}`}>
                      <Icono className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900">
                        {tipo.texto}
                        {m.tipo !== "canje" && m.cantidad !== 1 && ` (${m.cantidad > 0 ? "+" : ""}${m.cantidad})`}
                      </p>
                      {detalle && <p className="truncate text-xs text-stone-500">{detalle}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-stone-400">
                      {fecha.format(new Date(m.creado_en))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {movimientos.length === MAX_MOVIMIENTOS && (
            <p className="text-xs text-stone-400">Se muestran los últimos {MAX_MOVIMIENTOS} movimientos.</p>
          )}
        </section>
      </div>
    </>
  );
}
