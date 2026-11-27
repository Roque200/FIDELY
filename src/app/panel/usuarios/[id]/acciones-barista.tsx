"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import {
  actualizarBarista,
  cambiarEstadoBarista,
  nuevoLinkBarista,
  type EstadoActivarBarista,
  type EstadoEditar,
  type EstadoLinkBarista,
} from "@/lib/actions/usuarios";
import {
  Campo,
  CLASE_BOTON,
  CLASE_BOTON_SECUNDARIO,
  CLASE_INPUT,
  MensajeError,
} from "@/components/formulario";
import { LinkInvitacion } from "@/components/panel/link-invitacion";
import { SelectorSucursal, type OpcionSucursal } from "../selector-sucursal";

// Nombre y sucursal del barista
export function FormularioEditarBarista({
  barista,
  sucursales,
}: {
  barista: { id: string; nombre: string; sucursal_id: string | null };
  sucursales: OpcionSucursal[];
}) {
  const [estado, accion, enviando] = useActionState<EstadoEditar, FormData>(actualizarBarista, {
    error: null,
    guardado: false,
    valores: null,
  });

  // El aviso de guardado se quita en cuanto vuelven a editar algo
  const [editado, setEditado] = useState(false);
  const [estadoPrevio, setEstadoPrevio] = useState(estado);
  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    setEditado(false);
  }

  const v = estado.valores ?? { nombre: barista.nombre, sucursal_id: barista.sucursal_id ?? "" };

  return (
    <form action={accion} onInput={() => setEditado(true)} className="space-y-4">
      <input type="hidden" name="id" value={barista.id} />
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
      <SelectorSucursal sucursales={sucursales} valor={v.sucursal_id} />
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

// Desactivar / reactivar
export function BotonEstadoBarista({ id, activo }: { id: string; activo: boolean }) {
  const [estado, accion, enviando] = useActionState<EstadoActivarBarista, FormData>(
    cambiarEstadoBarista,
    { error: null },
  );
  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activo" value={activo ? "0" : "1"} />
      <MensajeError texto={estado.error} />
      <button type="submit" disabled={enviando} className={activo ? CLASE_BOTON_SECUNDARIO : CLASE_BOTON}>
        {enviando ? "Guardando..." : activo ? "Desactivar barista" : "Reactivar barista"}
      </button>
    </form>
  );
}

// Nuevo link para quien no ha creado su contraseña
export function BotonLinkBarista({
  id,
  nombre,
  cafeteria,
}: {
  id: string;
  nombre: string;
  cafeteria: string;
}) {
  const [estado, accion, enviando] = useActionState<EstadoLinkBarista, FormData>(
    nuevoLinkBarista,
    { error: null, link: null },
  );
  return (
    <div className="space-y-3">
      <form action={accion}>
        <input type="hidden" name="id" value={id} />
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
        <LinkInvitacion
          link={estado.link}
          dueno={nombre}
          cafeteria={cafeteria}
          mensaje={`Hola ${nombre}, ya tienes tu cuenta de barista de ${cafeteria} en Fidely. Entra a este link para crear tu contraseña: ${estado.link}`}
          ayuda={`Mándaselo a ${nombre}. Sirve una sola vez y vence; el link anterior ya no funciona.`}
        />
      )}
    </div>
  );
}
