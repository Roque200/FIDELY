import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  titulo: string;
  descripcion?: string;
  accion?: React.ReactNode;
  // Enlace para regresar (ej. a la lista)
  regreso?: { href: string; texto: string };
};

// Barra de título de cada sección dentro del contenedor blanco
export function CabeceraSeccion({ titulo, descripcion, accion, regreso }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-4 md:px-6">
      <div>
        {regreso && (
          <Link
            href={regreso.href}
            className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {regreso.texto}
          </Link>
        )}
        <h1 className="text-xl font-semibold text-stone-900">{titulo}</h1>
        {descripcion && (
          <p className="mt-0.5 text-sm text-stone-500">{descripcion}</p>
        )}
      </div>
      {accion}
    </div>
  );
}
