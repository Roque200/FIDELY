import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Coffee } from "lucide-react";
import { cafeteriaPublica } from "@/lib/publico";
import { disenoEfectivo } from "@/lib/diseno";
import { generarCodigoSvg } from "@/lib/codigos";
import { PantallaCarga } from "@/components/pantalla-carga";
import { FormularioRegistro } from "./formulario-registro";

export const metadata: Metadata = {
  title: "Tu tarjeta de lealtad",
};

// Lee datos por cafetería en cada petición
export const instant = false;

export default function RegistroPage({ params }: PageProps<"/c/[slug]">) {
  return (
    <main className="flex flex-1 justify-center bg-stone-100 px-4 py-8">
      <div className="w-full max-w-md">
        <Suspense fallback={<PantallaCarga />}>
          <Contenido params={params} />
        </Suspense>
        <p className="mt-6 flex items-center justify-center gap-1 text-xs text-stone-400">
          <Coffee className="h-3.5 w-3.5" />
          Tarjetas de lealtad con Fidely
        </p>
      </div>
    </main>
  );
}

async function Contenido({ params }: { params: PageProps<"/c/[slug]">["params"] }) {
  const { slug } = await params;
  const publica = await cafeteriaPublica(slug);
  if (!publica) notFound();

  const { cafeteria, programas } = publica;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <h1 className="text-center text-2xl font-semibold text-stone-900">{cafeteria.nombre}</h1>

      {programas.length === 0 ? (
        <p className="mt-4 text-center text-sm text-stone-500">
          Esta cafetería no tiene un programa de lealtad activo por ahora. ¡Vuelve pronto!
        </p>
      ) : (
        <>
          <p className="mb-6 mt-1 text-center text-sm text-stone-500">
            Regístrate y junta sellos en cada compra.
          </p>
          <FormularioRegistro
            slug={publica.slug}
            programas={programas.map((p) => {
              const diseno = disenoEfectivo(cafeteria, p);
              return {
                id: p.id,
                nombre: p.nombre,
                descripcion: p.descripcion,
                premio: p.premio,
                sellos_requeridos: p.sellos_requeridos,
                diseno,
                codigo: generarCodigoSvg(diseno.tipoCodigo, "fidely:vista-previa"),
              };
            })}
          />
        </>
      )}
    </div>
  );
}
