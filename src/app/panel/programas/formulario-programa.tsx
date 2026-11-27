"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import {
  guardarPrograma,
  type EstadoPrograma,
  type ValoresPrograma,
} from "@/lib/actions/programas";
import {
  Campo,
  CLASE_BOTON,
  CLASE_BOTON_SECUNDARIO,
  CLASE_INPUT,
  MensajeError,
} from "@/components/formulario";
import { TarjetaDiseno } from "@/components/panel/tarjeta-diseno";
import type { DisenoTarjeta } from "@/lib/diseno";

type Props = {
  programa?: {
    id: string;
    nombre: string;
    descripcion: string | null;
    sellos_requeridos: number;
    premio: string;
    max_sellos_por_dia: number;
    activo: boolean;
  };
  // Diseño de la tarjeta y su código ya generado (para la vista previa)
  diseno: DisenoTarjeta;
  codigo: string;
  // Programas activos de la cafetería sin contar este, y el máximo del plan
  activosOtros: number;
  maximo: number;
  // Tarjetas de clientes que ya usan este programa
  tarjetas: number;
};

export function FormularioPrograma({
  programa,
  diseno,
  codigo,
  activosOtros,
  maximo,
  tarjetas,
}: Props) {
  const enLimite = activosOtros >= maximo;

  const inicial: ValoresPrograma = programa
    ? {
        nombre: programa.nombre,
        descripcion: programa.descripcion ?? "",
        sellos_requeridos: String(programa.sellos_requeridos),
        premio: programa.premio,
        max_sellos_por_dia: String(programa.max_sellos_por_dia),
        activo: programa.activo,
      }
    : {
        nombre: "",
        descripcion: "",
        sellos_requeridos: "9",
        premio: "",
        max_sellos_por_dia: "1",
        activo: !enLimite,
      };

  const [estado, accion, enviando] = useActionState(guardarPrograma, {
    error: null,
    valores: null,
  } satisfies EstadoPrograma);

  // Si hubo error se muestran los valores enviados; si no, los iniciales
  const v = estado.valores ?? inicial;

  // Lo que se ve en la vista previa (se actualiza al escribir)
  const [vista, setVista] = useState({
    nombre: v.nombre,
    premio: v.premio,
    sellos: v.sellos_requeridos,
  });
  const [estadoPrevio, setEstadoPrevio] = useState(estado);
  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    setVista({ nombre: v.nombre, premio: v.premio, sellos: v.sellos_requeridos });
  }

  return (
    <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Vista previa (arriba en celular, a la derecha en escritorio) */}
      <aside className="order-first lg:order-last">
        <div className="lg:sticky lg:top-6">
          <p className="mb-2 text-sm font-medium text-stone-500">Vista previa</p>
          <div className="mx-auto max-w-[300px]">
            <TarjetaDiseno
              diseno={diseno}
              programa={{
                nombre: vista.nombre || "Nombre del programa",
                premio: vista.premio || "Tu premio",
                sellos_requeridos: Number(vista.sellos),
              }}
              codigo={codigo}
            />
          </div>
          <p className="mt-2 text-center text-xs text-stone-400">
            Los sellos marcados son de ejemplo.
          </p>
        </div>
      </aside>

      <form action={accion} className="space-y-5">
        {programa && <input type="hidden" name="id" value={programa.id} />}

        {tarjetas > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Este programa ya tiene {tarjetas} tarjeta{tarjetas === 1 ? "" : "s"} de
              clientes. Si cambias los sellos o el premio, el cambio aplica para
              todos ellos.
            </p>
          </div>
        )}

        <Campo id="nombre" etiqueta="Nombre del programa" ayuda='Ej. "Compra 9 y el 10 es gratis".'>
          <input
            id="nombre"
            name="nombre"
            required
            minLength={2}
            maxLength={60}
            defaultValue={v.nombre}
            onChange={(e) => setVista((x) => ({ ...x, nombre: e.target.value }))}
            className={CLASE_INPUT}
          />
        </Campo>

        <Campo id="premio" etiqueta="Premio" ayuda='Ej. "Café americano gratis".'>
          <input
            id="premio"
            name="premio"
            required
            minLength={2}
            maxLength={60}
            defaultValue={v.premio}
            onChange={(e) => setVista((x) => ({ ...x, premio: e.target.value }))}
            className={CLASE_INPUT}
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="sellos_requeridos"
            etiqueta="Sellos para el premio"
            ayuda="Entre 1 y 50."
          >
            <input
              id="sellos_requeridos"
              name="sellos_requeridos"
              type="number"
              required
              min={1}
              max={50}
              defaultValue={v.sellos_requeridos}
              onChange={(e) => setVista((x) => ({ ...x, sellos: e.target.value }))}
              className={CLASE_INPUT}
            />
          </Campo>
          <Campo
            id="max_sellos_por_dia"
            etiqueta="Sellos máximos por día"
            ayuda="Por cliente, para evitar abusos."
          >
            <input
              id="max_sellos_por_dia"
              name="max_sellos_por_dia"
              type="number"
              required
              min={1}
              max={20}
              defaultValue={v.max_sellos_por_dia}
              className={CLASE_INPUT}
            />
          </Campo>
        </div>

        <Campo id="descripcion" etiqueta="Descripción (opcional)" ayuda="Condiciones o detalles para tus clientes. Máximo 200 caracteres.">
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            maxLength={200}
            defaultValue={v.descripcion}
            className={CLASE_INPUT}
          />
        </Campo>

        <div className="rounded-lg p-3 ring-1 ring-stone-200">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="activo"
              value="1"
              defaultChecked={v.activo}
              className="mt-1 h-4 w-4 accent-amber-900"
            />
            <span>
              <span className="block text-sm font-medium text-stone-900">
                Programa activo
              </span>
              <span className="block text-sm text-stone-500">
                Si está inactivo, los clientes no pueden registrarse ni recibir
                sellos con él. Tu plan permite {maximo} programa
                {maximo === 1 ? "" : "s"} activo{maximo === 1 ? "" : "s"}
                {enLimite && !programa?.activo
                  ? " y ya los tienes; guárdalo inactivo o desactiva otro."
                  : "."}
              </span>
            </span>
          </label>
        </div>

        <MensajeError texto={estado.error} />

        <div className="flex flex-wrap justify-end gap-2">
          <Link href="/panel" className={CLASE_BOTON_SECUNDARIO}>
            Cancelar
          </Link>
          <button type="submit" disabled={enviando} className={CLASE_BOTON}>
            {enviando
              ? "Guardando..."
              : programa
                ? "Guardar cambios"
                : "Crear programa"}
          </button>
        </div>
      </form>
    </div>
  );
}
