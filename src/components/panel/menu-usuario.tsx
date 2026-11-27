import { LogOut } from "lucide-react";
import { cerrarSesion } from "@/lib/actions/sesion";

type Props = {
  nombre: string;
  detalle: string | null;
};

// Avatar, nombre y botón de salir (barra superior)
export function MenuUsuario({ nombre, detalle }: Props) {
  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-tight text-stone-900">
          {nombre}
        </p>
        {detalle && (
          <p className="text-xs leading-tight text-stone-500">{detalle}</p>
        )}
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-700 text-sm font-semibold text-white">
        {inicial}
      </span>
      <form action={cerrarSesion}>
        <button
          type="submit"
          title="Cerrar sesión"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-stone-600 transition hover:bg-stone-200 hover:text-stone-900"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </form>
    </div>
  );
}
