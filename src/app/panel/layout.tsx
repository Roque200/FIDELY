import { Suspense } from "react";
import { verificarAcceso } from "@/lib/auth";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Redirigir } from "@/components/redirigir";
import { Estructura, type ItemMenu } from "@/components/panel/estructura";
import { MenuUsuario } from "@/components/panel/menu-usuario";

// Sección protegida: depende de la sesión,
// así que no se valida como navegación instantánea.
export const instant = false;

const MENU_DUENO: ItemMenu[] = [
  { etiqueta: "Tarjetas", icono: "tarjetas", href: "/panel", rutas: ["/panel/programas"] },
  { etiqueta: "Escáner", icono: "escaner", href: "/barista" },
  { etiqueta: "Clientes", icono: "clientes", href: "/panel/clientes" },
  { etiqueta: "Informes", icono: "informes" },
  { etiqueta: "Sucursales", icono: "sucursales" },
  { etiqueta: "Usuarios", icono: "usuarios" },
  { etiqueta: "Configuración", icono: "configuracion" },
];

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
    <Estructura
      items={MENU_DUENO}
      usuario={
        <MenuUsuario nombre={acceso.perfil.nombre} detalle="Dueño" />
      }
    >
      {children}
    </Estructura>
  );
}
