import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, Coffee, Gift, PartyPopper, TriangleAlert, Wallet } from "lucide-react";
import { tarjetaPublica } from "@/lib/publico";
import { disenoEfectivo } from "@/lib/diseno";
import { generarCodigoSvg } from "@/lib/codigos";
import { configGoogle } from "@/lib/google-wallet";
import { configApple } from "@/lib/apple-wallet";
import { headers } from "next/headers";
import { PantallaCarga } from "@/components/pantalla-carga";
import { TarjetaDiseno } from "@/components/panel/tarjeta-diseno";

export const metadata: Metadata = {
  title: "Mi tarjeta",
  // El link es personal: que no lo indexen ni lo muestren en buscadores
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const instant = false;

const MENSAJES_WALLET: Record<string, string> = {
  error: "No pudimos preparar tu tarjeta para Google Wallet. Intenta de nuevo en un momento.",
  "no-disponible": "Google Wallet no está disponible por ahora.",
  "apple-error": "No pudimos preparar tu tarjeta para Apple Wallet. Intenta de nuevo en un momento.",
  "apple-no-disponible": "Apple Wallet no está disponible por ahora.",
};

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
  const { nueva, wallet } = await searchParams;
  const tarjeta = await tarjetaPublica(codigo);
  if (!tarjeta) notFound();

  const { programa } = tarjeta;
  const diseno = disenoEfectivo(tarjeta.cafeteria, programa);
  const completa = tarjeta.sellos >= programa.sellos_requeridos;
  const faltan = Math.max(0, programa.sellos_requeridos - tarjeta.sellos);

  // Botones de Wallet: primero el del celular que trae (Apple en iPhone/Mac)
  const agente = (await headers()).get("user-agent") ?? "";
  const esApple = /iPhone|iPad|iPod|Macintosh/.test(agente);
  const botonesWallet = [
    configApple() && { href: `/api/wallet/apple/pase/${tarjeta.codigo}`, texto: "Agregar a Apple Wallet", apple: true },
    configGoogle() && { href: `/api/wallet/google/${tarjeta.codigo}`, texto: "Agregar a Google Wallet", apple: false },
  ]
    .filter((b): b is { href: string; texto: string; apple: boolean } => Boolean(b))
    .sort((a, b) => Number(b.apple === esApple) - Number(a.apple === esApple));

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

      {typeof wallet === "string" && MENSAJES_WALLET[wallet] && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{MENSAJES_WALLET[wallet]}</p>
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

      {botonesWallet.length > 0 && (
        <div className="space-y-3">
          {botonesWallet.map((b) => (
            // Sin prefetch: la tarjeta de Wallet se prepara solo cuando la piden
            <a
              key={b.href}
              href={b.href}
              className="mx-auto flex w-full max-w-[320px] items-center justify-center gap-2 rounded-full bg-black px-5 py-3 font-medium text-white transition hover:bg-stone-800"
            >
              <Wallet className="h-5 w-5" />
              {b.texto}
            </a>
          ))}
        </div>
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
