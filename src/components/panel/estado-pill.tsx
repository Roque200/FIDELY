const TONOS = {
  verde: "bg-emerald-500",
  ambar: "bg-amber-500",
  rojo: "bg-red-500",
  gris: "bg-stone-400",
} as const;

type Props = {
  texto: string;
  tono: keyof typeof TONOS;
};

// Etiqueta redonda con punto de color (Activo, Inactivo, Prueba...)
export function EstadoPill({ texto, tono }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm text-stone-600 ring-1 ring-stone-200">
      <span className={`h-2 w-2 rounded-full ${TONOS[tono]}`} />
      {texto}
    </span>
  );
}
