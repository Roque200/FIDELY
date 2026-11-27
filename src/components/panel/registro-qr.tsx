"use client";

import { useState } from "react";
import { Check, Copy, Download, QrCode } from "lucide-react";

type Props = {
  link: string;
  qr: string;
  nombreArchivo: string;
};

// Link y QR de la página de registro de clientes (para imprimir en el mostrador)
export function RegistroQr({ link, qr, nombreArchivo }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [verQr, setVerQr] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  function descargar() {
    // Con margen blanco para que se lea bien impreso
    const svg = qr.replace(
      /<svg([^>]*)viewBox="0 0 (\d+) (\d+)"([^>]*)>/,
      (_m, a, w, h, b) =>
        `<svg${a}viewBox="-20 -20 ${Number(w) + 40} ${Number(h) + 40}"${b}><rect x="-20" y="-20" width="${Number(w) + 40}" height="${Number(h) + 40}" fill="#ffffff"/>`,
    );
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombreArchivo}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-4 mt-4 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200 md:mx-6">
      <div className="flex flex-wrap items-center gap-3">
        <QrCode className="h-5 w-5 shrink-0 text-amber-900" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-900">Registro de clientes</p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate font-mono text-xs text-stone-500 hover:text-amber-900 hover:underline"
          >
            {link}
          </a>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copiar}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-stone-700 ring-1 ring-stone-300 hover:bg-white"
          >
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiado ? "Copiado" : "Copiar"}
          </button>
          <button
            type="button"
            onClick={() => setVerQr((x) => !x)}
            aria-expanded={verQr}
            className="flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
          >
            <QrCode className="h-4 w-4" />
            {verQr ? "Ocultar QR" : "Ver QR"}
          </button>
        </div>
      </div>

      {verQr && (
        <div className="mt-3 flex flex-col items-center gap-3 border-t border-stone-200 pt-3 sm:flex-row">
          <div
            className="h-40 w-40 shrink-0 rounded-xl bg-white p-3 ring-1 ring-stone-200 [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <div className="space-y-2 text-sm text-stone-600">
            <p>
              Imprímelo y ponlo en el mostrador: tus clientes lo escanean con la cámara de su
              celular, se registran y obtienen su tarjeta.
            </p>
            <button
              type="button"
              onClick={descargar}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-white"
            >
              <Download className="h-4 w-4" />
              Descargar QR para imprimir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
