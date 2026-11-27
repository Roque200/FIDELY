import { Suspense } from "react";
import { verificarAcceso } from "@/lib/auth";
import { Encabezado } from "@/components/encabezado";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Redirigir } from "@/components/redirigir";

// Sección protegida: depende de la sesión,
// así que no se valida como navegación instantánea.
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <SeccionAdmin>{children}</SeccionAdmin>
    </Suspense>
  );
}

// Lee la sesión (por eso va dentro de Suspense) y valida que sea super admin
async function SeccionAdmin({ children }: { children: React.ReactNode }) {
  const acceso = await verificarAcceso("admin");

  if (!acceso.permitido) {
    return <Redirigir a={acceso.destino} />;
  }

  return (
    <div className="flex flex-1 flex-col bg-stone-50">
      <Encabezado titulo="Super admin" subtitulo={acceso.perfil.correo} />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
