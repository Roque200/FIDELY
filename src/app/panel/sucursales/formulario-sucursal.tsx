"use client";

import { useActionState } from "react";
import Link from "next/link";
import { guardarSucursal, type EstadoSucursal } from "@/lib/actions/sucursales";
import {
  Campo,
  CLASE_BOTON,
  CLASE_BOTON_SECUNDARIO,
  CLASE_INPUT,
  MensajeError,
} from "@/components/formulario";

type Props = {
  sucursal?: { id: string; nombre: string; direccion: string | null };
};

const ESTADO_INICIAL: EstadoSucursal = { error: null, valores: null };

export function FormularioSucursal({ sucursal }: Props) {
  const [estado, accion, enviando] = useActionState(guardarSucursal, ESTADO_INICIAL);

  // Si hubo error se muestran los valores enviados; si no, los guardados
  const v = estado.valores ?? {
    nombre: sucursal?.nombre ?? "",
    direccion: sucursal?.direccion ?? "",
  };

  return (
    <form action={accion} className="space-y-4">
      {sucursal && <input type="hidden" name="id" value={sucursal.id} />}

      <Campo id="nombre" etiqueta="Nombre" ayuda="Así la ve el barista en el escáner (ej. Centro, Plaza Norte).">
        <input
          key={`n-${v.nombre}`}
          id="nombre"
          name="nombre"
          required
          maxLength={60}
          defaultValue={v.nombre}
          className={CLASE_INPUT}
        />
      </Campo>

      <Campo id="direccion" etiqueta="Dirección (opcional)">
        <textarea
          key={`d-${v.direccion}`}
          id="direccion"
          name="direccion"
          rows={2}
          maxLength={200}
          defaultValue={v.direccion}
          className={CLASE_INPUT}
        />
      </Campo>

      <MensajeError texto={estado.error} />

      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/panel/sucursales" className={CLASE_BOTON_SECUNDARIO}>
          Cancelar
        </Link>
        <button type="submit" disabled={enviando} className={CLASE_BOTON}>
          {enviando ? "Guardando..." : sucursal ? "Guardar cambios" : "Crear sucursal"}
        </button>
      </div>
    </form>
  );
}
