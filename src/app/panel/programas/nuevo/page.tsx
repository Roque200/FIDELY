import { Suspense } from "react";
import type { Metadata } from "next";
import { verificarAcceso } from "@/lib/auth";
import { PantallaCarga } from "@/components/pantalla-carga";
import { CabeceraSeccion } from "@/components/panel/cabecera-seccion";
import { generarQrSvg } from "@/components/panel/tarjeta-wallet";
import { FormularioPrograma } from "../formulario-programa";
import { datosCafeteria } from "../datos";

export const metadata: Metadata = {
  title: "Nuevo programa",
};

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

export default function NuevoProgramaPage() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const acceso = await verificarAcceso("dueno");
  if (!acceso.permitido) return null;

  const [{ diseno, maximo, activosOtros, totalProgramas }, qr] = await Promise.all([
    datosCafeteria(acceso.perfil.cafeteriaId),
    generarQrSvg("fidely:vista-previa"),
  ]);

  return (
    <>
      <CabeceraSeccion
        titulo="Nuevo programa"
        descripcion="Define cuántos sellos necesita tu cliente y qué se gana."
        regreso={{ href: "/panel", texto: "Tarjetas" }}
      />
      {/* key: Next guarda en memoria las páginas visitadas; si cambian los
          datos (se creó otro programa), el formulario empieza de cero */}
      <FormularioPrograma
        key={`${totalProgramas}-${activosOtros}-${maximo}`}
        cafeteria={diseno}
        qr={qr}
        activosOtros={activosOtros}
        maximo={maximo}
        tarjetas={0}
      />
    </>
  );
}
