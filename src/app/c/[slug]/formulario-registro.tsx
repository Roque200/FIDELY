"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { PartyPopper } from "lucide-react";
import {
  registrarCliente,
  type EstadoRegistro,
} from "@/lib/actions/registro";
import type { DisenoTarjeta } from "@/lib/diseno";
import { Campo, CLASE_INPUT, MensajeError } from "@/components/formulario";
import { BotonEnviar } from "@/components/boton-enviar";
import { TarjetaDiseno } from "@/components/panel/tarjeta-diseno";

type ProgramaOpcion = {
  id: string;
  nombre: string;
  descripcion: string | null;
  premio: string;
  sellos_requeridos: number;
  diseno: DisenoTarjeta;
  codigo: string;
};

type Props = {
  slug: string;
  programas: ProgramaOpcion[];
};

const ESTADO_INICIAL: EstadoRegistro = { error: null, yaRegistrado: false, valores: null };

export function FormularioRegistro({ slug, programas }: Props) {
  const [estado, accion] = useActionState(registrarCliente, ESTADO_INICIAL);
  const v = estado.valores;
  const [programaId, setProgramaId] = useState(v?.programa_id || programas[0].id);
  const programa = programas.find((p) => p.id === programaId) ?? programas[0];

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-[300px]">
        <TarjetaDiseno
          diseno={programa.diseno}
          programa={programa}
          codigo={programa.codigo}
          sellosMuestra={0}
          codigoEjemplo
        />
        <p className="mt-2 text-center text-xs text-stone-500">
          Junta {programa.sellos_requeridos} sellos y llévate: {programa.premio}.
        </p>
        {programa.descripcion && (
          <p className="mt-1 text-center text-xs text-stone-400">{programa.descripcion}</p>
        )}
      </div>

      {estado.yaRegistrado ? (
        <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="flex items-center gap-2 font-medium">
            <PartyPopper className="h-4 w-4" />
            ¡Ya estás registrado en este programa!
          </p>
          <p>
            Busca tu tarjeta en el link que guardaste. Si la perdiste, pide ayuda en
            caja para recuperarla.
          </p>
        </div>
      ) : (
        <form action={accion} className="space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="programa_id" value={programa.id} />

          {/* Trampa para robots: una persona no ve ni llena este campo */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Sitio web
              <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          {programas.length > 1 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-stone-700">
                Elige tu programa
              </legend>
              <div className="grid gap-2">
                {programas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={p.id === programa.id}
                    onClick={() => setProgramaId(p.id)}
                    className={`rounded-xl p-3 text-left ring-1 transition ${
                      p.id === programa.id
                        ? "bg-amber-50 ring-2 ring-amber-800"
                        : "bg-white ring-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <span className="block text-sm font-medium text-stone-900">{p.nombre}</span>
                    <span className="block text-xs text-stone-500">
                      {p.sellos_requeridos} sellos · {p.premio}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <Campo id="nombre" etiqueta="Tu nombre">
            <input
              id="nombre"
              name="nombre"
              required
              minLength={2}
              maxLength={60}
              autoComplete="name"
              defaultValue={v?.nombre}
              className={CLASE_INPUT}
            />
          </Campo>
          <Campo id="telefono" etiqueta="Teléfono (10 dígitos)">
            <input
              id="telefono"
              name="telefono"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder="55 1234 5678"
              defaultValue={v?.telefono}
              className={CLASE_INPUT}
            />
          </Campo>
          <Campo id="correo" etiqueta="Correo" ayuda="Escribe al menos tu teléfono o tu correo.">
            <input
              id="correo"
              name="correo"
              type="email"
              autoComplete="email"
              maxLength={120}
              defaultValue={v?.correo}
              className={CLASE_INPUT}
            />
          </Campo>

          <label className="flex items-start gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              name="acepta"
              value="1"
              required
              defaultChecked={v?.acepta}
              className="mt-0.5 h-4 w-4 accent-amber-900"
            />
            <span>
              Acepto el{" "}
              <Link href={`/c/${slug}/privacidad`} target="_blank" className="font-medium text-amber-900 underline">
                aviso de privacidad
              </Link>
              .
            </span>
          </label>

          <MensajeError texto={estado.error} />

          <BotonEnviar
            texto="Obtener mi tarjeta"
            textoEnviando="Creando tu tarjeta..."
            className="w-full rounded-lg bg-amber-900 px-4 py-3 font-medium text-white transition hover:bg-amber-800 disabled:opacity-60"
          />
        </form>
      )}
    </div>
  );
}
