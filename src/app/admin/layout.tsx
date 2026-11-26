import { Suspense } from "react";
import { requireRol } from "@/lib/auth";
import { Encabezado } from "@/components/encabezado";
import { PantallaCarga } from "@/components/pantalla-carga";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <SeccionAdmin>{children}</SeccionAdmin>
    </Suspense>
  );
}

// Lee la sesión (por eso va dentro de Suspense) y valida que sea super admin
async function SeccionAdmin({ children }: { children: React.ReactNode }) {
  const perfil = await requireRol("admin");

  return (
    <div className="flex flex-1 flex-col bg-stone-50">
      <Encabezado titulo="Super admin" subtitulo={perfil.correo} />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
