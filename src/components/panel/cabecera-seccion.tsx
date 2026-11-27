type Props = {
  titulo: string;
  descripcion?: string;
  accion?: React.ReactNode;
};

// Barra de título de cada sección dentro del contenedor blanco
export function CabeceraSeccion({ titulo, descripcion, accion }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-4 md:px-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">{titulo}</h1>
        {descripcion && (
          <p className="mt-0.5 text-sm text-stone-500">{descripcion}</p>
        )}
      </div>
      {accion}
    </div>
  );
}
