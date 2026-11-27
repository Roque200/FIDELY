"use client";

import { ICONOS_SELLO, type ClaveIcono } from "@/lib/diseno";

type Props = {
  nombre: string;
  etiqueta: string;
  valor: ClaveIcono;
  onCambio: (valor: ClaveIcono) => void;
  deshabilitado?: boolean;
};

// Cuadrícula para elegir el ícono del sello del catálogo
export function SelectorIcono({ nombre, etiqueta, valor, onCambio, deshabilitado }: Props) {
  return (
    <>
    {/* Fuera del fieldset: si está deshabilitado, sus campos no se envían */}
    <input type="hidden" name={nombre} value={valor} />
    <fieldset disabled={deshabilitado} className={deshabilitado ? "opacity-40" : ""}>
      <legend className="sr-only">{etiqueta}</legend>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-6 xl:grid-cols-8">
        {(Object.keys(ICONOS_SELLO) as ClaveIcono[]).map((clave) => {
          const { Icono, etiqueta: nombreIcono } = ICONOS_SELLO[clave];
          const elegido = clave === valor;
          return (
            <button
              key={clave}
              type="button"
              title={nombreIcono}
              aria-label={`${etiqueta}: ${nombreIcono}`}
              aria-pressed={elegido}
              onClick={() => onCambio(clave)}
              className={`flex aspect-square items-center justify-center rounded-lg transition ${
                elegido
                  ? "bg-amber-900 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              <Icono className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </fieldset>
    </>
  );
}
