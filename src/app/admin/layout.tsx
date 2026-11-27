import { Suspense } from "react";
import { verificarAcceso } from "@/lib/auth";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Redirigir } from "@/components/redirigir";
import { Estructura, type ItemMenu } from "@/components/panel/estructura";
import { MenuUsuario } from "@/components/panel/menu-usuario";

// Sección protegida: depende de la sesión,
// así que no se valida como navegación instantánea.
export const instant = false;

const MENU_ADMIN: ItemMenu[] = [
  { etiqueta: "Cafeterías", icono: "cafeterias", href: "/admin" },
  { etiqueta: "Configuración", icono: "configuracion" },
];

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
    <Estructura
      items={MENU_ADMIN}
      usuario={
        <MenuUsuario
          nombre={acceso.perfil.correo ?? "Super admin"}
          detalle="Super admin"
        />
      }
    >
      {children}
    </Estructura>
  );
}
