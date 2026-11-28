"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { nuevoLinkDueno, type EstadoLink } from "@/lib/actions/cafeterias";
import { CLASE_BOTON_SECUNDARIO, MensajeError } from "@/components/formulario";
import { LinkInvitacion } from "@/components/panel/link-invitacion";

type Props = {
  staffId: string;
  dueno: string;
  cafeteria: string;
  // Ya tiene contraseña: el link es para cambiarla (la olvidó)
  cambio?: boolean;
};

const ESTADO_INICIAL: EstadoLink = { error: null, link: null, cambio: false };

// Genera un link nuevo para el dueño: de invitación o para cambiar su contraseña
export function BotonNuevoLink({ staffId, dueno, cafeteria, cambio = false }: Props) {
  const [estado, accion, enviando] = useActionState(
    nuevoLinkDueno,
    ESTADO_INICIAL,
  );

  return (
    <div className="space-y-3">
      <form action={accion}>
        <input type="hidden" name="staff_id" value={staffId} />
        <button
          type="submit"
          disabled={enviando}
          className={`${CLASE_BOTON_SECUNDARIO} flex items-center gap-1.5`}
        >
          <RefreshCw className={`h-4 w-4 ${enviando ? "animate-spin" : ""}`} />
          {estado.link
            ? "Generar otro link"
            : cambio
              ? "Generar link para cambiar contraseña"
              : "Generar link de invitación"}
        </button>
      </form>
      <MensajeError texto={estado.error} />
      {estado.link && (
        <LinkInvitacion
          link={estado.link}
          dueno={dueno}
          cafeteria={cafeteria}
          {...(estado.cambio && {
            mensaje: `Hola ${dueno}, entra a este link para cambiar tu contraseña de Fidely (${cafeteria}): ${estado.link}`,
            ayuda: `Mándaselo a ${dueno}. Sirve una sola vez y vence; su contraseña actual sigue sirviendo hasta que la cambie.`,
          })}
        />
      )}
    </div>
  );
}
