"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

type Props = {
  link: string;
  dueno: string;
  cafeteria: string;
};

// Muestra el link de invitación con botones para copiar y mandar por WhatsApp
export function LinkInvitacion({ link, dueno, cafeteria }: Props) {
  const [copiado, setCopiado] = useState(false);

  const mensaje = `Hola ${dueno}, ya está lista la cuenta de ${cafeteria} en Fidely. Entra a este link para crear tu contraseña: ${link}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador no deja copiar, el link está seleccionable en el campo
      setCopiado(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <div>
        <p className="font-medium text-amber-950">Link de invitación</p>
        <p className="text-sm text-amber-900/80">
          Mándaselo a {dueno}. Sirve una sola vez y vence; si no lo usa a
          tiempo, genera uno nuevo desde la cafetería.
        </p>
      </div>
      <input
        readOnly
        value={link}
        aria-label="Link de invitación"
        onFocus={(e) => e.currentTarget.select()}
        className="block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-stone-700"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copiar}
          className="flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiado ? "Copiado" : "Copiar link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          Mandar por WhatsApp
        </a>
      </div>
    </div>
  );
}
