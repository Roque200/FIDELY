import { Suspense } from "react";
import type { Metadata } from "next";
import { getPerfil } from "@/lib/auth";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Redirigir } from "@/components/redirigir";
import { Logo } from "@/components/panel/logo";
import { FormularioContrasena } from "./formulario-contrasena";

export const metadata: Metadata = {
  title: "Bienvenido",
};

// Depende de la sesión, así que no se valida como navegación instantánea.
export const instant = false;

export default function BienvenidaPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-stone-100 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-stone-200">
        <Logo />
        <Suspense fallback={<PantallaCarga />}>
          <Contenido />
        </Suspense>
      </div>
    </main>
  );
}

// Lee la sesión (por eso va dentro de Suspense)
async function Contenido() {
  const perfil = await getPerfil();

  // Sin sesión (link vencido o ya usado): al login
  if (!perfil) return <Redirigir a="/login" />;

  const nombre =
    perfil.tipo === "dueno" || perfil.tipo === "barista" ? perfil.nombre : null;

  return (
    <>
      <h1 className="mt-6 text-xl font-semibold text-stone-900">
        {nombre ? `¡Hola, ${nombre}!` : "¡Bienvenido!"}
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        Crea tu contraseña para entrar a Fidely
        {perfil.correo ? ` con ${perfil.correo}` : ""}.
      </p>
      <FormularioContrasena />
    </>
  );
}
