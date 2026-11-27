import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { confirmarLink } from "@/lib/actions/sesion";
import { Logo } from "@/components/panel/logo";
import { PantallaCarga } from "@/components/pantalla-carga";
import { BotonEnviar } from "@/components/boton-enviar";

export const metadata: Metadata = {
  title: "Entrar a Fidely",
  // Que los buscadores y las vistas previas no la indexen
  robots: { index: false, follow: false },
};

// Lee los parámetros del link, así que no se valida como navegación instantánea.
export const instant = false;

// Abrir el link NO lo usa: solo muestra el botón "Continuar".
// Así las vistas previas de WhatsApp, correo, etc. no gastan el link.
export default function ConfirmarPage({ searchParams }: PageProps<"/auth/confirmar">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-stone-100 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-stone-200">
        <Logo />
        <Suspense fallback={<PantallaCarga />}>
          <Contenido searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido({
  searchParams,
}: {
  searchParams: PageProps<"/auth/confirmar">["searchParams"];
}) {
  const params = await searchParams;
  const uno = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";

  const tokenHash = uno(params.token_hash);
  const tipo = uno(params.type);
  const next = uno(params.next);

  if (!tokenHash || !tipo) {
    return (
      <>
        <h1 className="mt-6 text-xl font-semibold text-stone-900">
          Link incompleto
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Este link no está completo. Pide uno nuevo a quien te invitó.
        </p>
        <Link
          href="/login"
          className="mt-6 block text-center text-sm font-medium text-amber-900 underline"
        >
          Ir a iniciar sesión
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mt-6 text-xl font-semibold text-stone-900">¡Bienvenido!</h1>
      <p className="mt-1 text-sm text-stone-500">
        Da clic en continuar para entrar y crear tu contraseña.
      </p>
      <form action={confirmarLink} className="mt-6">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={tipo} />
        <input type="hidden" name="next" value={next} />
        <BotonEnviar
          texto="Continuar"
          textoEnviando="Entrando..."
          className="w-full rounded-lg bg-amber-900 px-4 py-2.5 font-medium text-white transition hover:bg-amber-800 disabled:opacity-60"
        />
      </form>
    </>
  );
}
