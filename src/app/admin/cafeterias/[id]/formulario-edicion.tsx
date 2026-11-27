"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  actualizarCafeteria,
  type EstadoEdicion,
} from "@/lib/actions/cafeterias";
import {
  Campo,
  CLASE_BOTON,
  CLASE_INPUT,
  MensajeError,
} from "@/components/formulario";
import { SelectorZona } from "@/components/selector-zona";

type Props = {
  cafeteria: {
    id: string;
    nombre: string;
    zona_horaria: string;
    plan: string;
    estado_suscripcion: string;
    max_programas: number;
  };
  // Cambia cada vez que se guarda (actualizado_en): los campos se vuelven a
  // crear con lo guardado, sin perder el aviso de "Cambios guardados"
  version: string;
};

const ESTADO_INICIAL: EstadoEdicion = {
  error: null,
  guardado: false,
  valores: null,
};

export function FormularioEdicion({ cafeteria, version }: Props) {
  const [estado, accion, enviando] = useActionState(
    actualizarCafeteria,
    ESTADO_INICIAL,
  );

  // Si hubo error se muestran los valores enviados; si no, los guardados
  const v = estado.valores ?? {
    nombre: cafeteria.nombre,
    zona_horaria: cafeteria.zona_horaria,
    plan: cafeteria.plan,
    estado_suscripcion: cafeteria.estado_suscripcion,
    max_programas: String(cafeteria.max_programas),
  };

  // El aviso de guardado se quita en cuanto vuelven a editar algo
  const [editado, setEditado] = useState(false);
  const [estadoPrevio, setEstadoPrevio] = useState(estado);
  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    setEditado(false);
  }

  return (
    <form action={accion} onInput={() => setEditado(true)} className="space-y-4">
      <input type="hidden" name="id" value={cafeteria.id} />

      <div key={version} className="space-y-4">

      <Campo id="nombre" etiqueta="Nombre">
        <input
          id="nombre"
          name="nombre"
          required
          maxLength={80}
          defaultValue={v.nombre}
          className={CLASE_INPUT}
        />
      </Campo>

      <SelectorZona valorInicial={v.zona_horaria} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo id="plan" etiqueta="Plan">
          <input
            id="plan"
            name="plan"
            required
            maxLength={30}
            defaultValue={v.plan}
            className={CLASE_INPUT}
          />
        </Campo>
        <Campo id="estado_suscripcion" etiqueta="Estado">
          <select
            id="estado_suscripcion"
            name="estado_suscripcion"
            defaultValue={v.estado_suscripcion}
            className={CLASE_INPUT}
          >
            <option value="prueba">Prueba</option>
            <option value="activa">Activa</option>
            <option value="vencida">Vencida</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </Campo>
        <Campo
          id="max_programas"
          etiqueta="Programas máx."
          ayuda="Programas activos que puede tener."
        >
          <input
            id="max_programas"
            name="max_programas"
            type="number"
            min={1}
            max={50}
            required
            defaultValue={v.max_programas}
            className={CLASE_INPUT}
          />
        </Campo>
      </div>
      </div>

      <MensajeError texto={estado.error} />

      <div className="flex items-center justify-end gap-3">
        {estado.guardado && !enviando && !editado && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Cambios guardados
          </span>
        )}
        <button type="submit" disabled={enviando} className={CLASE_BOTON}>
          {enviando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
