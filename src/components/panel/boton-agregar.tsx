import Link from "next/link";
import { Plus } from "lucide-react";

const CLASES =
  "flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50";

// Botón "+ Agregar". Con href lleva al formulario; con pronto va deshabilitado.
export function BotonAgregar({
  href,
  pronto = false,
}: {
  href?: string;
  pronto?: boolean;
}) {
  const contenido = (
    <>
      <Plus className="h-4 w-4" strokeWidth={2.5} />
      Agregar
    </>
  );

  if (href && !pronto) {
    return (
      <Link href={href} className={CLASES}>
        {contenido}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pronto}
      title={pronto ? "Esta función viene pronto" : undefined}
      className={CLASES}
    >
      {contenido}
    </button>
  );
}
