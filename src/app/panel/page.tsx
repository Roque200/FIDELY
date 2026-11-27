import { Suspense } from "react";
import { verificarAcceso } from "@/lib/auth";
import { PantallaCarga } from "@/components/pantalla-carga";

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

export default function PanelPage() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido />
    </Suspense>
  );
}

// Lee la sesión (por eso va dentro de Suspense).
// Si no tiene acceso no muestra nada: el layout lo redirige.
async function Contenido() {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  return (
    <h1 className="text-xl font-semibold text-stone-900">
      Hola, {acceso.perfil.nombre}
    </h1>
  );
}
