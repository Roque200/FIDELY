import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getPerfil, rutaInicio } from "@/lib/auth";
import { PantallaCarga } from "@/components/pantalla-carga";

// Punto de entrada: manda a cada quien a su sección según su rol
export default function Inicio() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Redirigir />
    </Suspense>
  );
}

async function Redirigir(): Promise<never> {
  const perfil = await getPerfil();

  if (!perfil) {
    redirect("/login");
  }

  redirect(rutaInicio(perfil.tipo));
}
