import { Suspense } from "react";
import { verificarAcceso } from "@/lib/auth";
import { Encabezado } from "@/components/encabezado";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Redirigir } from "@/components/redirigir";

// Sección protegida: depende de la sesión,
// así que no se valida como navegación instantánea.
export const instant = false;

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
  const acceso = await verificarAcceso("barista", "dueno");

  if (!acceso.permitido) {
    return <Redirigir a={acceso.destino} />;
  }

  return (
    <div className="flex flex-1 flex-col bg-stone-50">
      <Encabezado titulo="Escáner" subtitulo={acceso.perfil.nombre} />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
