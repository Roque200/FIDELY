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
};

const ESTADO_INICIAL: EstadoLink = { error: null, link: null };

// Genera un link nuevo para un dueño que no ha aceptado su invitación
export function BotonNuevoLink({ staffId, dueno, cafeteria }: Props) {
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
          {estado.link ? "Generar otro link" : "Generar link de invitación"}
        </button>
      </form>
      <MensajeError texto={estado.error} />
      {estado.link && (
        <LinkInvitacion link={estado.link} dueno={dueno} cafeteria={cafeteria} />
      )}
    </div>
  );
}
