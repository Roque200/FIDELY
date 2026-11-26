import { BotonSalir } from "@/components/boton-salir";

type Props = {
  titulo: string;
  subtitulo: string | null;
};

export function Encabezado({ titulo, subtitulo }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
      <div>
        <p className="font-semibold text-stone-900">{titulo}</p>
        {subtitulo && <p className="text-sm text-stone-500">{subtitulo}</p>}
      </div>
      <BotonSalir />
    </header>
  );
}
