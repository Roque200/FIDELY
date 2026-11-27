import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, Coffee, Gift, PartyPopper } from "lucide-react";
import { tarjetaPublica } from "@/lib/publico";
import { disenoEfectivo } from "@/lib/diseno";
import { generarCodigoSvg } from "@/lib/codigos";
import { PantallaCarga } from "@/components/pantalla-carga";
import { TarjetaDiseno } from "@/components/panel/tarjeta-diseno";

export const metadata: Metadata = {
  title: "Mi tarjeta",
  // El link es personal: que no lo indexen ni lo muestren en buscadores
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const instant = false;

export default function TarjetaPage({ params, searchParams }: PageProps<"/t/[codigo]">) {
  return (
    <main className="flex flex-1 justify-center bg-stone-100 px-4 py-8">
      <div className="w-full max-w-md">
        <Suspense fallback={<PantallaCarga />}>
          <Contenido params={params} searchParams={searchParams} />
        </Suspense>
        <p className="mt-6 flex items-center justify-center gap-1 text-xs text-stone-400">
          <Coffee className="h-3.5 w-3.5" />
          Tarjetas de lealtad con Fidely
        </p>
      </div>
    </main>
  );
}

async function Contenido({
  params,
  searchParams,
}: {
  params: PageProps<"/t/[codigo]">["params"];
  searchParams: PageProps<"/t/[codigo]">["searchParams"];
}) {
  const { codigo } = await params;
  const { nueva } = await searchParams;
  const tarjeta = await tarjetaPublica(codigo);
  if (!tarjeta) notFound();

  const { programa } = tarjeta;
  const diseno = disenoEfectivo(tarjeta.cafeteria, programa);
  const completa = tarjeta.sellos >= programa.sellos_requeridos;
  const faltan = Math.max(0, programa.sellos_requeridos - tarjeta.sellos);

  return (
    <div className="space-y-5">
      {nueva === "1" && (
        <div className="space-y-1 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
          <p className="flex items-center gap-2 font-medium">
            <PartyPopper className="h-4 w-4" />
            ¡Listo, {tarjeta.cliente}! Ya tienes tu tarjeta.
          </p>
          <p className="flex items-start gap-2">
            <Bookmark className="mt-0.5 h-4 w-4 shrink-0" />
            Guarda esta página (en favoritos o en tu pantalla de inicio): es tu tarjeta.
          </p>
        </div>
      )}

      <div>
        <p className="text-sm text-stone-500">Hola,</p>
        <h1 className="text-2xl font-semibold text-stone-900">{tarjeta.cliente}</h1>
      </div>

      <div className="mx-auto max-w-[320px]">
        <TarjetaDiseno
          diseno={diseno}
          programa={programa}
          codigo={generarCodigoSvg(diseno.tipoCodigo, tarjeta.codigo)}
          sellosMuestra={tarjeta.sellos}
        />
      </div>

      {completa ? (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <Gift className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>¡Completaste tu tarjeta!</strong> Muestra este código en caja para recibir:{" "}
            {programa.premio}.
          </p>
        </div>
      ) : (
        <p className="text-center text-sm text-stone-600">
          Te {faltan === 1 ? "falta" : "faltan"} <strong>{faltan}</strong> sello
          {faltan === 1 ? "" : "s"} para: {programa.premio}.
        </p>
      )}

      {!programa.activo && (
        <p className="rounded-xl bg-stone-50 p-3 text-center text-xs text-stone-500 ring-1 ring-stone-200">
          Este programa está pausado por la cafetería; por ahora no se pueden agregar sellos.
        </p>
      )}

      <div className="space-y-1 text-center text-xs text-stone-500">
        <p>Muestra el código en caja para que te pongan tu sello.</p>
        {tarjeta.premiosCanjeados > 0 && (
          <p>
            Premios canjeados: <strong>{tarjeta.premiosCanjeados}</strong>
          </p>
        )}
        <p className="font-mono text-[11px] tracking-wider text-stone-400">
          {tarjeta.codigo.match(/.{1,4}/g)?.join(" ")}
        </p>
      </div>

      <p className="text-center text-xs">
        <Link href={`/c/${tarjeta.slug}`} className="text-stone-500 underline">
          {tarjeta.cafeteria.nombre}
        </Link>
      </p>
    </div>
  );
}
