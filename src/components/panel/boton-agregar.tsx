import { Plus } from "lucide-react";

// Botón "+ Agregar". Mientras no exista el formulario va deshabilitado.
export function BotonAgregar({ pronto = false }: { pronto?: boolean }) {
  return (
    <button
      type="button"
      disabled={pronto}
      title={pronto ? "Esta función viene pronto" : undefined}
      className="flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} />
      Agregar
    </button>
  );
}
