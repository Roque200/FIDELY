"use client";

import { useState } from "react";

type Props = {
  nombre: string;
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
};

const HEX = /^#[0-9A-Fa-f]{6}$/;

// Selector de color con muestra y campo #RRGGBB
export function CampoColor({ nombre, etiqueta, valor, onCambio }: Props) {
  // Lo que escriben en el campo de texto (puede estar a medias)
  const [texto, setTexto] = useState(valor);
  const [valorPrevio, setValorPrevio] = useState(valor);
  if (valor !== valorPrevio) {
    setValorPrevio(valor);
    setTexto(valor);
  }

  const valido = HEX.test(texto);

  return (
    <div className="flex items-stretch overflow-hidden rounded-xl ring-1 ring-stone-200">
      <label
        className="relative w-16 shrink-0 cursor-pointer"
        style={{ backgroundColor: HEX.test(valor) ? valor : "#FFFFFF" }}
        title={`Elegir ${etiqueta.toLowerCase()}`}
      >
        <input
          type="color"
          value={HEX.test(valor) ? valor.toLowerCase() : "#000000"}
          onChange={(e) => onCambio(e.target.value.toUpperCase())}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={`Elegir ${etiqueta.toLowerCase()}`}
        />
      </label>
      <div className="min-w-0 flex-1 px-3 py-2">
        <label htmlFor={nombre} className="block text-sm font-medium text-stone-900">
          {etiqueta}
        </label>
        <input
          id={nombre}
          name={nombre}
          value={texto}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setTexto(v);
            if (HEX.test(v)) onCambio(v);
          }}
          className={`w-full bg-transparent font-mono text-sm outline-none ${
            valido ? "text-stone-600" : "text-red-700"
          }`}
        />
      </div>
    </div>
  );
}
