"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { invitarBarista, type EstadoInvitar } from "@/lib/actions/usuarios";
import {
  Campo,
  CLASE_BOTON,
  CLASE_BOTON_SECUNDARIO,
  CLASE_INPUT,
  MensajeError,
} from "@/components/formulario";
import { LinkInvitacion } from "@/components/panel/link-invitacion";
import { SelectorSucursal, type OpcionSucursal } from "../selector-sucursal";

type Props = {
  cafeteria: string;
  sucursales: OpcionSucursal[];
};

export function FormularioBarista({ cafeteria, sucursales }: Props) {
  const activas = sucursales.filter((s) => s.activa);
  const inicial: EstadoInvitar = {
    error: null,
    resultado: null,
    // Con una sola sucursal se asigna sola
    valores: { nombre: "", correo: "", sucursal_id: activas.length === 1 ? activas[0].id : "" },
  };
  const [estado, accion, enviando] = useActionState(invitarBarista, inicial);

  if (estado.resultado) {
    const r = estado.resultado;
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div>
            <p className="text-lg font-medium text-stone-900">{r.nombre} ya está invitado</p>
            <p className="text-sm text-stone-500">
              Se creó su cuenta de barista ({r.correo}). Falta que abra su link
              para crear su contraseña; después entra directo al escáner.
            </p>
          </div>
        </div>

        <LinkInvitacion
          link={r.link}
          dueno={r.nombre}
          cafeteria={cafeteria}
          mensaje={`Hola ${r.nombre}, ya tienes tu cuenta de barista de ${cafeteria} en Fidely. Entra a este link para crear tu contraseña: ${r.link}`}
          ayuda={`Mándaselo a ${r.nombre}. Sirve una sola vez y vence; si no lo usa a tiempo, genera uno nuevo desde Usuarios.`}
        />

        <div className="flex flex-wrap gap-2">
          <Link href="/panel/usuarios" className={CLASE_BOTON}>
            Ver usuarios
          </Link>
        </div>
      </div>
    );
  }

  const v = estado.valores;
  return (
    <form action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="nombre" etiqueta="Nombre">
          <input
            key={`n-${v.nombre}`}
            id="nombre"
            name="nombre"
            required
            maxLength={80}
            defaultValue={v.nombre}
            className={CLASE_INPUT}
          />
        </Campo>
        <Campo id="correo" etiqueta="Correo" ayuda="Con este correo va a entrar al escáner.">
          <input
            key={`c-${v.correo}`}
            id="correo"
            name="correo"
            type="email"
            required
            autoComplete="off"
            maxLength={254}
            defaultValue={v.correo}
            className={CLASE_INPUT}
          />
        </Campo>
      </div>

      <SelectorSucursal sucursales={sucursales} valor={v.sucursal_id} />

      <MensajeError texto={estado.error} />

      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/panel/usuarios" className={CLASE_BOTON_SECUNDARIO}>
          Cancelar
        </Link>
        <button type="submit" disabled={enviando} className={CLASE_BOTON}>
          {enviando ? "Invitando..." : "Invitar barista"}
        </button>
      </div>
    </form>
  );
}
