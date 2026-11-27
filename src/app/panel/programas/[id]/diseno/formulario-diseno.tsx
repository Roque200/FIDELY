"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  guardarDiseno,
  type EstadoDiseno,
  type ValoresDiseno,
} from "@/lib/actions/diseno";
import {
  esIconoValido,
  esTipoCodigoValido,
  TIPOS_CODIGO,
  type ClaveIcono,
  type DisenoTarjeta,
  type TipoCodigo,
} from "@/lib/diseno";
import { CLASE_BOTON, MensajeError } from "@/components/formulario";
import { TarjetaDiseno } from "@/components/panel/tarjeta-diseno";
import { SubirImagen } from "@/components/panel/subir-imagen";
import { CampoColor } from "@/components/panel/campo-color";
import { SelectorIcono } from "@/components/panel/selector-icono";

type Props = {
  programaId: string;
  cafeteriaId: string;
  nombreCafeteria: string;
  programa: { nombre: string; premio: string; sellos_requeridos: number };
  // Diseño guardado (ya combinado con el de la cafetería)
  guardado: ValoresDiseno;
  // SVG de cada tipo de código para la vista previa
  codigos: Record<TipoCodigo, string>;
  // Cambia cada vez que se guarda: los campos se vuelven a crear con lo guardado
  version: string;
};

const ESTADO_INICIAL: EstadoDiseno = { error: null, guardado: false, valores: null };

export function FormularioDiseno(props: Props) {
  const [estado, accion, enviando] = useActionState(guardarDiseno, ESTADO_INICIAL);

  // El aviso de guardado se quita en cuanto vuelven a editar algo
  const [editado, setEditado] = useState(false);
  const [estadoPrevio, setEstadoPrevio] = useState(estado);
  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    setEditado(false);
  }

  return (
    <form action={accion} onInput={() => setEditado(true)} onClick={(e) => {
      // Los botones de íconos/código también cuentan como edición
      if ((e.target as HTMLElement).closest("button[type=button]")) setEditado(true);
    }}>
      <input type="hidden" name="id" value={props.programaId} />
      <Campos
        key={props.version}
        {...props}
        valores={estado.valores ?? props.guardado}
        pie={
          <>
            <MensajeError texto={estado.error} />
            <div className="flex items-center justify-end gap-3">
              {estado.guardado && !enviando && !editado && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Diseño guardado
                </span>
              )}
              <button type="submit" disabled={enviando} className={CLASE_BOTON}>
                {enviando ? "Guardando..." : "Guardar diseño"}
              </button>
            </div>
          </>
        }
      />
    </form>
  );
}

function Campos({
  programaId,
  cafeteriaId,
  nombreCafeteria,
  programa,
  codigos,
  valores,
  pie,
}: Props & { valores: ValoresDiseno; pie: React.ReactNode }) {
  const [v, setV] = useState(valores);
  const [usarPropio, setUsarPropio] = useState(Boolean(valores.icono_sello_url));
  const [usarPropioInactivo, setUsarPropioInactivo] = useState(
    Boolean(valores.icono_sello_inactivo_url),
  );
  const [variante, setVariante] = useState<"apple" | "google">("apple");

  const cambiar = (campo: keyof ValoresDiseno) => (valor: string) =>
    setV((x) => ({ ...x, [campo]: valor }));

  const carpeta = `${cafeteriaId}/${programaId}`;
  const icono = (c: string): ClaveIcono => (esIconoValido(c) ? c : "cafe");
  const tipo: TipoCodigo = esTipoCodigoValido(v.tipo_codigo) ? v.tipo_codigo : "qr";
  const hex = (c: string, respaldo: string) => (/^#[0-9A-F]{6}$/i.test(c) ? c : respaldo);

  const diseno: DisenoTarjeta = {
    nombreCafeteria,
    logoHorizontal: v.logo_horizontal_url || null,
    logoCuadrado: v.logo_cuadrado_url || null,
    colorFondo: hex(v.color_fondo, "#FFFFFF"),
    colorEtiquetas: hex(v.color_etiquetas, "#000000"),
    colorTexto: hex(v.color_texto, "#000000"),
    iconoSello: icono(v.icono_sello),
    iconoSelloUrl: usarPropio ? v.icono_sello_url || null : null,
    iconoSelloInactivo: icono(v.icono_sello_inactivo),
    iconoSelloInactivoUrl: usarPropioInactivo ? v.icono_sello_inactivo_url || null : null,
    colorSelloActivo: hex(v.color_sello_activo, "#000000"),
    colorSelloInactivo: hex(v.color_sello_inactivo, "#999999"),
    colorFondoSello: hex(v.color_fondo_sello, "#EEEEEE"),
    tipoCodigo: tipo,
  };

  return (
    <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Vista previa */}
      <aside className="order-first lg:order-last">
        <div className="lg:sticky lg:top-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-stone-500">Vista previa</p>
            <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs" role="group" aria-label="Cartera">
              {(["apple", "google"] as const).map((x) => (
                <button
                  key={x}
                  type="button"
                  aria-pressed={variante === x}
                  onClick={() => setVariante(x)}
                  className={`rounded-md px-2 py-1 font-medium ${
                    variante === x ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
                  }`}
                >
                  {x === "apple" ? "Apple" : "Google"}
                </button>
              ))}
            </div>
          </div>
          <div className="mx-auto max-w-[300px]">
            <TarjetaDiseno
              diseno={diseno}
              programa={programa}
              codigo={codigos[tipo]}
              variante={variante}
            />
          </div>
          <p className="mt-2 text-center text-xs text-stone-400">
            Los sellos marcados son de ejemplo.
          </p>
        </div>
      </aside>

      <div className="space-y-8">
        <Seccion titulo="Logos">
          <div className="grid gap-3 sm:grid-cols-2">
            <SubirImagen
              nombre="logo_horizontal_url"
              etiqueta="Logo horizontal"
              ayuda="Para Apple Wallet. PNG o JPG, ideal 480×150 px."
              url={v.logo_horizontal_url}
              onCambio={cambiar("logo_horizontal_url")}
              carpeta={carpeta}
              minAncho={160}
              minAlto={50}
            />
            <SubirImagen
              nombre="logo_cuadrado_url"
              etiqueta="Logo cuadrado"
              ayuda="Para Google Wallet. PNG o JPG cuadrado, ideal 660×660 px."
              url={v.logo_cuadrado_url}
              onCambio={cambiar("logo_cuadrado_url")}
              carpeta={carpeta}
              minAncho={200}
              minAlto={200}
              cuadrada
            />
          </div>
        </Seccion>

        <Seccion titulo="Colores de la tarjeta">
          <div className="grid gap-3 sm:grid-cols-3">
            <CampoColor nombre="color_fondo" etiqueta="Fondo" valor={v.color_fondo} onCambio={cambiar("color_fondo")} />
            <CampoColor nombre="color_etiquetas" etiqueta="Etiquetas" valor={v.color_etiquetas} onCambio={cambiar("color_etiquetas")} />
            <CampoColor nombre="color_texto" etiqueta="Texto" valor={v.color_texto} onCambio={cambiar("color_texto")} />
          </div>
        </Seccion>

        <Seccion titulo="Íconos de los sellos">
          <div className="grid gap-6 sm:grid-cols-2">
            <IconoSello
              titulo="Sello activo"
              nombre="icono_sello"
              nombreUrl="icono_sello_url"
              nombreUsar="usar_icono_propio"
              icono={icono(v.icono_sello)}
              url={v.icono_sello_url}
              usarPropio={usarPropio}
              setUsarPropio={setUsarPropio}
              onIcono={cambiar("icono_sello")}
              onUrl={cambiar("icono_sello_url")}
              carpeta={carpeta}
            />
            <IconoSello
              titulo="Sello inactivo"
              nombre="icono_sello_inactivo"
              nombreUrl="icono_sello_inactivo_url"
              nombreUsar="usar_icono_inactivo_propio"
              icono={icono(v.icono_sello_inactivo)}
              url={v.icono_sello_inactivo_url}
              usarPropio={usarPropioInactivo}
              setUsarPropio={setUsarPropioInactivo}
              onIcono={cambiar("icono_sello_inactivo")}
              onUrl={cambiar("icono_sello_inactivo_url")}
              carpeta={carpeta}
            />
          </div>
        </Seccion>

        <Seccion titulo="Colores de los sellos">
          <div className="grid gap-3 sm:grid-cols-3">
            <CampoColor nombre="color_sello_activo" etiqueta="Sello activo" valor={v.color_sello_activo} onCambio={cambiar("color_sello_activo")} />
            <CampoColor nombre="color_sello_inactivo" etiqueta="Sello inactivo" valor={v.color_sello_inactivo} onCambio={cambiar("color_sello_inactivo")} />
            <CampoColor nombre="color_fondo_sello" etiqueta="Fondo de los sellos" valor={v.color_fondo_sello} onCambio={cambiar("color_fondo_sello")} />
          </div>
        </Seccion>

        <Seccion titulo="Código">
          <input type="hidden" name="tipo_codigo" value={tipo} />
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(TIPOS_CODIGO) as TipoCodigo[]).map((t) => {
              const elegido = t === tipo;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={elegido}
                  onClick={() => cambiar("tipo_codigo")(t)}
                  className={`flex items-center gap-3 rounded-xl p-3 text-left ring-1 transition ${
                    elegido ? "bg-amber-50 ring-2 ring-amber-800" : "ring-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <span
                    className={`shrink-0 rounded bg-white p-1 ring-1 ring-stone-200 [&_svg]:h-full [&_svg]:w-full ${
                      t === "pdf417" || t === "code128" ? "h-8 w-16" : "h-10 w-10"
                    }`}
                    dangerouslySetInnerHTML={{ __html: codigos[t] }}
                  />
                  <span>
                    <span className="block text-sm font-medium text-stone-900">
                      {TIPOS_CODIGO[t].etiqueta}
                    </span>
                    <span className="block text-xs text-stone-500">{TIPOS_CODIGO[t].ayuda}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Seccion>

        {pie}
      </div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 border-b border-stone-200 pb-2 text-sm font-semibold text-stone-900">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function IconoSello({
  titulo,
  nombre,
  nombreUrl,
  nombreUsar,
  icono,
  url,
  usarPropio,
  setUsarPropio,
  onIcono,
  onUrl,
  carpeta,
}: {
  titulo: string;
  nombre: string;
  nombreUrl: string;
  nombreUsar: string;
  icono: ClaveIcono;
  url: string;
  usarPropio: boolean;
  setUsarPropio: (v: boolean) => void;
  onIcono: (v: string) => void;
  onUrl: (v: string) => void;
  carpeta: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-stone-900">{titulo}</p>
      <SelectorIcono
        nombre={nombre}
        etiqueta={titulo}
        valor={icono}
        onCambio={onIcono}
        deshabilitado={usarPropio}
      />
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={usarPropio}
          onChange={(e) => setUsarPropio(e.target.checked)}
          className="h-4 w-4 accent-amber-900"
        />
        Usar archivo propio
      </label>
      <input type="hidden" name={nombreUsar} value={usarPropio ? "1" : ""} />
      {usarPropio ? (
        <SubirImagen
          nombre={nombreUrl}
          etiqueta={`Ícono de ${titulo.toLowerCase()}`}
          ayuda="PNG cuadrado con fondo transparente, mínimo 96×96 px."
          url={url}
          onCambio={onUrl}
          carpeta={carpeta}
          minAncho={96}
          minAlto={96}
          cuadrada
        />
      ) : (
        <input type="hidden" name={nombreUrl} value={url} />
      )}
    </div>
  );
}
