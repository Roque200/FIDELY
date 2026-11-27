import { Suspense } from "react";
import type { Metadata } from "next";
import { verificarAcceso } from "@/lib/auth";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { FormularioAlta } from "./formulario-alta";

export const metadata: Metadata = {
  title: "Nueva cafetería",
};

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

export default function NuevaCafeteriaPage() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const acceso = await verificarAcceso("admin");
  if (!acceso.permitido) return null;

  return (
    <>
      <CabeceraSeccion
        titulo="Nueva cafetería"
        descripcion="Se crea la cafetería y la cuenta del dueño; te damos un link para que él cree su contraseña."
      />
      <FormularioAlta />
    </>
  );
}
