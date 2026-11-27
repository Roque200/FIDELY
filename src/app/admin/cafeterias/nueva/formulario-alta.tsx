"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { crearCafeteria, type EstadoAlta } from "@/lib/actions/cafeterias";
import { crearSlug } from "@/lib/slug";
import { ZONAS_HORARIAS } from "@/lib/zonas-horarias";
import {
  Campo,
  CLASE_BOTON,
  CLASE_BOTON_SECUNDARIO,
  CLASE_INPUT,
  MensajeError,
} from "@/components/formulario";
import { LinkInvitacion } from "@/components/panel/link-invitacion";

const ESTADO_INICIAL: EstadoAlta = {
  error: null,
  resultado: null,
  valores: {
    nombre: "",
    slug: "",
    zona_horaria: "America/Mexico_City",
    plan: "basico",
    estado_suscripcion: "prueba",
    max_programas: "1",
    dueno_nombre: "",
    dueno_correo: "",
  },
};

export function FormularioAlta() {
  const [estado, accion, enviando] = useActionState(
    crearCafeteria,
    ESTADO_INICIAL,
  );

  // El slug se arma solo con el nombre hasta que lo editan a mano
  const [nombre, setNombre] = useState(estado.valores.nombre);
  const [slug, setSlug] = useState(estado.valores.slug);
  const [slugEditado, setSlugEditado] = useState(false);

  if (estado.resultado) {
    const r = estado.resultado;
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 p-4 md:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div>
            <p className="text-lg font-medium text-stone-900">
              {r.cafeteria} quedó dada de alta
            </p>
            <p className="text-sm text-stone-500">
              Se creó la cuenta de {r.dueno} ({r.correo}) como dueño. Falta que
              abra su link para crear su contraseña.
            </p>
          </div>
        </div>

        <LinkInvitacion link={r.link} dueno={r.dueno} cafeteria={r.cafeteria} />

        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/cafeterias/${r.cafeteriaId}`} className={CLASE_BOTON}>
            Ver cafetería
          </Link>
          <Link href="/admin" className={CLASE_BOTON_SECUNDARIO}>
            Volver a cafeterías
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={accion} className="mx-auto w-full max-w-2xl space-y-8 p-4 md:p-6">
      <fieldset className="space-y-4">
        <legend className="mb-1 text-base font-semibold text-stone-900">
          Cafetería
        </legend>

        <Campo id="nombre" etiqueta="Nombre">
          <input
            id="nombre"
            name="nombre"
            required
            maxLength={80}
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (!slugEditado) setSlug(crearSlug(e.target.value));
            }}
            className={CLASE_INPUT}
          />
        </Campo>

        <Campo
          id="slug"
          etiqueta="Slug (dirección pública)"
          ayuda={`Los clientes se registran en /c/${slug || "tu-cafeteria"}. No se puede cambiar después.`}
        >
          <input
            id="slug"
            name="slug"
            required
            maxLength={40}
            value={slug}
            onChange={(e) => {
              setSlugEditado(true);
              setSlug(e.target.value.toLowerCase());
            }}
            className={`${CLASE_INPUT} font-mono text-sm`}
          />
        </Campo>

        <Campo id="zona_horaria" etiqueta="Zona horaria">
          <select
            id="zona_horaria"
            name="zona_horaria"
            defaultValue={estado.valores.zona_horaria}
            className={CLASE_INPUT}
          >
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
              defaultValue={estado.valores.plan}
              className={CLASE_INPUT}
            />
          </Campo>
          <Campo id="estado_suscripcion" etiqueta="Estado">
            <select
              id="estado_suscripcion"
              name="estado_suscripcion"
              defaultValue={estado.valores.estado_suscripcion}
              className={CLASE_INPUT}
            >
              <option value="prueba">Prueba</option>
              <option value="activa">Activa</option>
              <option value="vencida">Vencida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </Campo>
          <Campo id="max_programas" etiqueta="Programas máx.">
            <input
              id="max_programas"
              name="max_programas"
              type="number"
              min={1}
              max={50}
              required
              defaultValue={estado.valores.max_programas}
              className={CLASE_INPUT}
            />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-base font-semibold text-stone-900">
          Dueño
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="dueno_nombre" etiqueta="Nombre">
            <input
              id="dueno_nombre"
              name="dueno_nombre"
              required
              maxLength={80}
              defaultValue={estado.valores.dueno_nombre}
              className={CLASE_INPUT}
            />
          </Campo>
          <Campo
            id="dueno_correo"
            etiqueta="Correo"
            ayuda="Con este correo va a entrar a su panel."
          >
            <input
              id="dueno_correo"
              name="dueno_correo"
              type="email"
              required
              autoComplete="off"
              defaultValue={estado.valores.dueno_correo}
              className={CLASE_INPUT}
            />
          </Campo>
        </div>
      </fieldset>

      <MensajeError texto={estado.error} />

      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/admin" className={CLASE_BOTON_SECUNDARIO}>
          Cancelar
        </Link>
        <button type="submit" disabled={enviando} className={CLASE_BOTON}>
          {enviando ? "Creando..." : "Crear cafetería e invitar dueño"}
        </button>
      </div>
    </form>
  );
}
