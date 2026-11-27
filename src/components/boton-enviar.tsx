"use client";

import { useFormStatus } from "react-dom";

type Props = {
  texto: string;
  textoEnviando: string;
  className?: string;
};

// Botón de envío que se deshabilita mientras el formulario se procesa
export function BotonEnviar({ texto, textoEnviando, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? textoEnviando : texto}
    </button>
  );
}
