import type { Metadata } from "next";
import Link from "next/link";
import { Store, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Olvidé mi contraseña",
};

// Mientras no haya correo propio, el link para cambiar la contraseña lo
// genera quien da de alta a cada persona y se lo manda por WhatsApp.
export default function RecuperarPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-stone-100 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-stone-200">
        <h1 className="text-2xl font-semibold text-stone-900">¿Olvidaste tu contraseña?</h1>
        <p className="mt-1 text-sm text-stone-500">
          Pide un link para cambiarla. Te llega por WhatsApp y sirve una sola vez.
        </p>

        <ul className="mt-6 space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-900/10 text-amber-900">
              <UserRound className="h-4 w-4" />
            </span>
            <p className="text-stone-600">
              <span className="font-medium text-stone-900">Si eres barista,</span>{" "}
              pídeselo al dueño de tu cafetería. Lo genera desde su panel, en
              Usuarios.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-900/10 text-amber-900">
              <Store className="h-4 w-4" />
            </span>
            <p className="text-stone-600">
              <span className="font-medium text-stone-900">Si eres dueño,</span>{" "}
              pídeselo a quien te dio de alta en Fidely.
            </p>
          </li>
        </ul>

        <Link
          href="/login"
          className="mt-8 block rounded-lg bg-amber-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-amber-800"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
