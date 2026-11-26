import { Suspense } from "react";
import { requireRol } from "@/lib/auth";
import { Encabezado } from "@/components/encabezado";
import { PantallaCarga } from "@/components/pantalla-carga";

export default function BaristaLayout({ children }: LayoutProps<"/barista">) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <SeccionBarista>{children}</SeccionBarista>
    </Suspense>
  );
}

// Lee la sesión (por eso va dentro de Suspense).
// El dueño también puede entrar a sellar y canjear.
async function SeccionBarista({ children }: { children: React.ReactNode }) {
  const perfil = await requireRol("barista", "dueno");

  return (
    <div className="flex flex-1 flex-col bg-stone-50">
      <Encabezado titulo="Escáner" subtitulo={perfil.nombre} />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
