"use client";

import { useState } from "react";
import { ZONAS_HORARIAS, etiquetaZonaAnterior } from "@/lib/zonas-horarias";
import { Campo, CLASE_INPUT } from "@/components/formulario";

// Selector de zona horaria que muestra debajo los estados que incluye.
// No es controlado: así, cuando el formulario se reinicia tras enviarse,
// vuelve a la zona que regresó el servidor (valorInicial) y no a la primera.
export function SelectorZona({ valorInicial }: { valorInicial: string }) {
  const [valor, setValor] = useState(valorInicial);
  const [inicialPrevio, setInicialPrevio] = useState(valorInicial);

  // Si el servidor regresa otro valor, la ayuda se actualiza
  if (valorInicial !== inicialPrevio) {
    setInicialPrevio(valorInicial);
    setValor(valorInicial);
  }

  const zona = ZONAS_HORARIAS.find((z) => z.valor === valor);
  const enLista = ZONAS_HORARIAS.some((z) => z.valor === valorInicial);

  return (
    <Campo
      id="zona_horaria"
      etiqueta="Zona horaria"
      ayuda={zona ? `Incluye: ${zona.estados}` : undefined}
    >
      <select
        key={valorInicial}
        id="zona_horaria"
        name="zona_horaria"
        defaultValue={valorInicial}
        onChange={(e) => setValor(e.target.value)}
        className={CLASE_INPUT}
      >
        {/* Una zona de antes que ya no está en la lista se muestra para no perderla */}
        {!enLista && (
          <option value={valorInicial}>{etiquetaZonaAnterior(valorInicial)}</option>
        )}
        {ZONAS_HORARIAS.map((z) => (
          <option key={z.valor} value={z.valor}>
            {z.etiqueta}
          </option>
        ))}
      </select>
    </Campo>
  );
}
