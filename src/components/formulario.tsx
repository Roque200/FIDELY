// Piezas comunes de los formularios del panel

export const CLASE_INPUT =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 disabled:bg-stone-100";

export const CLASE_BOTON =
  "rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60";

export const CLASE_BOTON_SECUNDARIO =
  "rounded-lg px-4 py-2.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60";

type CampoProps = {
  id: string;
  etiqueta: string;
  ayuda?: string;
  children: React.ReactNode;
};

export function Campo({ id, etiqueta, ayuda, children }: CampoProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {etiqueta}
      </label>
      {children}
      {ayuda && <p className="mt-1 text-xs text-stone-500">{ayuda}</p>}
    </div>
  );
}

export function MensajeError({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200"
    >
      {texto}
    </p>
  );
}
