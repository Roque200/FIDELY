"use client";

import { useActionState } from "react";
import {
  definirContrasena,
  type EstadoContrasena,
} from "@/lib/actions/sesion";
import { Campo, CLASE_INPUT, MensajeError } from "@/components/formulario";

const ESTADO_INICIAL: EstadoContrasena = { error: null };

export function FormularioContrasena() {
  const [estado, accion, enviando] = useActionState(
    definirContrasena,
    ESTADO_INICIAL,
  );

  return (
    <form action={accion} className="mt-6 space-y-4">
      <Campo id="password" etiqueta="Contraseña" ayuda="Mínimo 8 caracteres.">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={CLASE_INPUT}
        />
      </Campo>
      <Campo id="confirmacion" etiqueta="Repite la contraseña">
        <input
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={CLASE_INPUT}
        />
      </Campo>

      <MensajeError texto={estado.error} />

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-amber-900 px-4 py-2.5 font-medium text-white transition hover:bg-amber-800 disabled:opacity-60"
      >
        {enviando ? "Guardando..." : "Guardar y entrar"}
      </button>
    </form>
  );
}
