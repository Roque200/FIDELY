import { Suspense } from "react";
import { verificarAcceso } from "@/lib/auth";
import { Encabezado } from "@/components/encabezado";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Redirigir } from "@/components/redirigir";

// Sección protegida: depende de la sesión,
// así que no se valida como navegación instantánea.
export const instant = false;

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <SeccionDueno>{children}</SeccionDueno>
    </Suspense>
  );
}

// Lee la sesión (por eso va dentro de Suspense) y valida que sea dueño
async function SeccionDueno({ children }: { children: React.ReactNode }) {
  const acceso = await verificarAcceso("dueno");

  if (!acceso.permitido) {
    return <Redirigir a={acceso.destino} />;
  }

  return (
    <div className="flex flex-1 flex-col bg-stone-50">
      <Encabezado titulo="Panel" subtitulo={acceso.perfil.nombre} />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
