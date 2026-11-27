"use client";

import { useActionState } from "react";
import { cambiarEstadoSucursal, type EstadoActivar } from "@/lib/actions/sucursales";
import { CLASE_BOTON, CLASE_BOTON_SECUNDARIO, MensajeError } from "@/components/formulario";

const ESTADO_INICIAL: EstadoActivar = { error: null };

// Desactivar / reactivar una sucursal
export function BotonEstadoSucursal({ id, activa }: { id: string; activa: boolean }) {
  const [estado, accion, enviando] = useActionState(cambiarEstadoSucursal, ESTADO_INICIAL);

  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activa" value={activa ? "0" : "1"} />
      <MensajeError texto={estado.error} />
      <button
        type="submit"
        disabled={enviando}
        className={activa ? CLASE_BOTON_SECUNDARIO : CLASE_BOTON}
      >
        {enviando ? "Guardando..." : activa ? "Desactivar sucursal" : "Reactivar sucursal"}
      </button>
    </form>
  );
}
