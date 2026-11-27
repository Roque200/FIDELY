"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  actualizarCafeteria,
  type EstadoEdicion,
} from "@/lib/actions/cafeterias";
import { ZONAS_HORARIAS } from "@/lib/zonas-horarias";
import {
  Campo,
  CLASE_BOTON,
  CLASE_INPUT,
  MensajeError,
} from "@/components/formulario";

type Props = {
  cafeteria: {
    id: string;
    nombre: string;
    zona_horaria: string;
    plan: string;
    estado_suscripcion: string;
    max_programas: number;
  };
};

const ESTADO_INICIAL: EstadoEdicion = { error: null, guardado: false };

export function FormularioEdicion({ cafeteria }: Props) {
  const [estado, accion, enviando] = useActionState(
    actualizarCafeteria,
    ESTADO_INICIAL,
  );

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="id" value={cafeteria.id} />

      <Campo id="nombre" etiqueta="Nombre">
        <input
          id="nombre"
          name="nombre"
          required
          maxLength={80}
          defaultValue={cafeteria.nombre}
          className={CLASE_INPUT}
        />
      </Campo>

      <Campo id="zona_horaria" etiqueta="Zona horaria">
        <select
          id="zona_horaria"
          name="zona_horaria"
          defaultValue={cafeteria.zona_horaria}
          className={CLASE_INPUT}
        >
          {/* Si tiene una zona fuera de la lista, se muestra para no perderla */}
          {!ZONAS_HORARIAS.some((z) => z.valor === cafeteria.zona_horaria) && (
            <option value={cafeteria.zona_horaria}>{cafeteria.zona_horaria}</option>
          )}
          {ZONAS_HORARIAS.map((z) => (
            <option key={z.valor} value={z.valor}>
              {z.etiqueta}
            </option>
          ))}
        </select>
      </Campo>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo id="plan" etiqueta="Plan">
          <input
            id="plan"
            name="plan"
            required
            maxLength={30}
            defaultValue={cafeteria.plan}
            className={CLASE_INPUT}
          />
        </Campo>
        <Campo id="estado_suscripcion" etiqueta="Estado">
          <select
            id="estado_suscripcion"
            name="estado_suscripcion"
            defaultValue={cafeteria.estado_suscripcion}
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
            defaultValue={cafeteria.max_programas}
            className={CLASE_INPUT}
          />
        </Campo>
      </div>

      <MensajeError texto={estado.error} />

      <div className="flex items-center justify-end gap-3">
        {estado.guardado && !enviando && (
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
