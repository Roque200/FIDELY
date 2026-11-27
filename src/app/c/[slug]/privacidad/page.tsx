import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cafeteriaPublica } from "@/lib/publico";
import { PantallaCarga } from "@/components/pantalla-carga";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
};

export const instant = false;

// Aviso de privacidad simplificado (provisional: revisarlo con un abogado
// antes de producción, conforme a la LFPDPPP)
export default function PrivacidadPage({ params }: PageProps<"/c/[slug]/privacidad">) {
  return (
    <main className="flex flex-1 justify-center bg-stone-100 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 md:p-8">
        <Suspense fallback={<PantallaCarga />}>
          <Contenido params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido({
  params,
}: {
  params: PageProps<"/c/[slug]/privacidad">["params"];
}) {
  const { slug } = await params;
  const publica = await cafeteriaPublica(slug);
  if (!publica) notFound();
  const nombre = publica.cafeteria.nombre;

  return (
    <article className="space-y-4 text-sm leading-relaxed text-stone-700">
      <h1 className="text-xl font-semibold text-stone-900">Aviso de privacidad simplificado</h1>
      <p>
        <strong>{nombre}</strong> es responsable del tratamiento de los datos personales que nos
        proporcionas al registrarte en su programa de lealtad.
      </p>
      <h2 className="font-semibold text-stone-900">¿Qué datos usamos?</h2>
      <p>Tu nombre y tu teléfono y/o correo electrónico.</p>
      <h2 className="font-semibold text-stone-900">¿Para qué los usamos?</h2>
      <p>
        Para crear y administrar tu tarjeta de lealtad: identificarte, registrar tus sellos y
        premios, y ayudarte a recuperar tu tarjeta si la pierdes. No los usamos para otros fines
        sin tu consentimiento.
      </p>
      <h2 className="font-semibold text-stone-900">¿Con quién los compartimos?</h2>
      <p>
        Solo con Fidely, la plataforma que opera el programa por cuenta de {nombre}, y con los
        proveedores necesarios para que tu tarjeta funcione en Apple Wallet o Google Wallet. No
        vendemos tus datos.
      </p>
      <h2 className="font-semibold text-stone-900">Tus derechos</h2>
      <p>
        Puedes pedir acceso, corrección, cancelación u oposición al uso de tus datos (derechos
        ARCO), o retirar tu consentimiento, directamente en {nombre}.
      </p>
      <p className="text-xs text-stone-400">
        Este aviso puede cambiar; la versión vigente siempre estará en esta página.
      </p>
      <Link href={`/c/${slug}`} className="inline-block font-medium text-amber-900 underline">
        Regresar al registro
      </Link>
    </article>
  );
}
