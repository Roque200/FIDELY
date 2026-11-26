"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "@/lib/actions/sesion";

const estadoInicial: EstadoLogin = { error: null, correo: "" };

export function LoginForm() {
  const [estado, accion, enviando] = useActionState(
    iniciarSesion,
    estadoInicial,
  );

  return (
    <form action={accion} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="correo"
          className="block text-sm font-medium text-stone-700"
        >
          Correo
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado.correo}
          className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-stone-700"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
        />
      </div>

      {estado.error && (
        <p className="text-sm text-red-600" role="alert">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-amber-900 px-4 py-2.5 font-medium text-white transition hover:bg-amber-800 disabled:opacity-60"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
