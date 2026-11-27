"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Mail, MessageCircle } from "lucide-react";

type Props = {
  link: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  cafeteria: string;
  programa: string;
};

// Botones para reenviarle al cliente el link de su tarjeta
export function EnviarTarjeta({ link, nombre, telefono, correo, cafeteria, programa }: Props) {
  const [copiado, setCopiado] = useState(false);

  const mensaje = `Hola ${nombre}, aquí está tu tarjeta "${programa}" de ${cafeteria}. Ábrela en este link para ver tus sellos o guardarla en tu Wallet: ${link}`;
  const whatsapp = telefono
    ? `https://wa.me/52${telefono}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  const boton =
    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium";

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className={`${boton} bg-emerald-600 text-white hover:bg-emerald-700`}
      >
        <MessageCircle className="h-4 w-4" />
        Mandar por WhatsApp
      </a>
      {correo && (
        <a
          href={`mailto:${correo}?subject=${encodeURIComponent(`Tu tarjeta de ${cafeteria}`)}&body=${encodeURIComponent(mensaje)}`}
          className={`${boton} bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50`}
        >
          <Mail className="h-4 w-4" />
          Mandar por correo
        </a>
      )}
      <button
        type="button"
        onClick={copiar}
        className={`${boton} bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50`}
      >
        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copiado ? "Copiado" : "Copiar link"}
      </button>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={`${boton} bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50`}
      >
        <ExternalLink className="h-4 w-4" />
        Ver tarjeta
      </a>
    </div>
  );
}
