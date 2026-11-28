import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPerfil, rutaInicio } from "@/lib/auth";
import { cerrarSesion } from "@/lib/actions/sesion";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-stone-100 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-stone-200">
        <h1 className="text-2xl font-semibold text-stone-900">Fidely</h1>
        <p className="mt-1 text-sm text-stone-500">
          Entra con tu cuenta de la cafetería.
        </p>

        <Suspense fallback={null}>
          <AvisoSesion searchParams={searchParams} />
        </Suspense>

        <LoginForm />

        <Link
          href="/login/recuperar"
          className="mt-4 block text-center text-sm text-stone-500 hover:text-stone-800 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </main>
  );
}

// Lee la sesión (por eso va dentro de Suspense):
// si ya entró, lo manda a su sección; si no tiene acceso, le avisa.
async function AvisoSesion({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const perfil = await getPerfil();

  if (perfil && perfil.tipo !== "sin_acceso") {
    redirect(rutaInicio(perfil.tipo));
  }

  const { error } = await searchParams;

  if (error === "link-invalido" && !perfil) {
    return (
      <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
        El link no es válido, ya se usó o ya venció. Pide uno nuevo a quien te
        lo mandó.
      </div>
    );
  }

  const sinAcceso = error === "sin-acceso" || perfil?.tipo === "sin_acceso";

  if (!sinAcceso) return null;

  return (
    <div className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
      Tu cuenta no tiene acceso a ninguna cafetería o fue desactivada. Pídele
      acceso al dueño.
      {perfil?.tipo === "sin_acceso" && (
        <form action={cerrarSesion} className="mt-2">
          <button type="submit" className="font-medium text-amber-900 underline">
            Cerrar sesión de {perfil.correo ?? "esta cuenta"}
          </button>
        </form>
      )}
    </div>
  );
}
