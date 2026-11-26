import { cerrarSesion } from "@/lib/actions/sesion";

export function BotonSalir() {
  return (
    <form action={cerrarSesion}>
      <button
        type="submit"
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 ring-1 ring-stone-300 transition hover:bg-stone-100"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
