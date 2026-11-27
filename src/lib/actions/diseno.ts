"use server";

import { refresh } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  COLOR_REGEX,
  esIconoValido,
  esTipoCodigoValido,
} from "@/lib/diseno";

export type ValoresDiseno = {
  logo_horizontal_url: string;
  logo_cuadrado_url: string;
  color_fondo: string;
  color_etiquetas: string;
  color_texto: string;
  icono_sello: string;
  icono_sello_url: string;
  icono_sello_inactivo: string;
  icono_sello_inactivo_url: string;
  color_sello_activo: string;
  color_sello_inactivo: string;
  color_fondo_sello: string;
  tipo_codigo: string;
};

export type EstadoDiseno = {
  error: string | null;
  guardado: boolean;
  // Lo que se envió, para no perderlo si hay error
  valores: ValoresDiseno | null;
};

const CAMPOS_IMAGEN = [
  ["logo_horizontal_url", "logo horizontal"],
  ["logo_cuadrado_url", "logo cuadrado"],
  ["icono_sello_url", "ícono del sello activo"],
  ["icono_sello_inactivo_url", "ícono del sello inactivo"],
] as const;

const CAMPOS_COLOR = [
  ["color_fondo", "fondo"],
  ["color_etiquetas", "etiquetas"],
  ["color_texto", "texto"],
  ["color_sello_activo", "sello activo"],
  ["color_sello_inactivo", "sello inactivo"],
  ["color_fondo_sello", "fondo de los sellos"],
] as const;

// Guarda el diseño de un programa (con la sesión del dueño: RLS y los
// permisos de columnas impiden tocar programas de otra cafetería).
export async function guardarDiseno(
  _anterior: EstadoDiseno,
  fd: FormData,
): Promise<EstadoDiseno> {
  const texto = (campo: string) => String(fd.get(campo) ?? "").trim();
  const id = texto("id");
  const valores: ValoresDiseno = {
    logo_horizontal_url: texto("logo_horizontal_url"),
    logo_cuadrado_url: texto("logo_cuadrado_url"),
    color_fondo: texto("color_fondo").toUpperCase(),
    color_etiquetas: texto("color_etiquetas").toUpperCase(),
    color_texto: texto("color_texto").toUpperCase(),
    icono_sello: texto("icono_sello"),
    // Si no marcó "usar archivo propio", el archivo no se usa
    icono_sello_url: fd.get("usar_icono_propio") === "1" ? texto("icono_sello_url") : "",
    icono_sello_inactivo: texto("icono_sello_inactivo"),
    icono_sello_inactivo_url:
      fd.get("usar_icono_inactivo_propio") === "1" ? texto("icono_sello_inactivo_url") : "",
    color_sello_activo: texto("color_sello_activo").toUpperCase(),
    color_sello_inactivo: texto("color_sello_inactivo").toUpperCase(),
    color_fondo_sello: texto("color_fondo_sello").toUpperCase(),
    tipo_codigo: texto("tipo_codigo"),
  };
  const fallo = (error: string): EstadoDiseno => ({ error, guardado: false, valores });

  const perfil = await getPerfil();
  if (perfil?.tipo !== "dueno") return fallo("No autorizado.");
  if (!/^[0-9a-f-]{36}$/.test(id)) return fallo("Programa no válido.");

  // Las imágenes solo pueden venir del almacenamiento de Fidely, en la carpeta de su cafetería
  const prefijo = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/disenos/${perfil.cafeteriaId}/`;
  for (const [campo, nombre] of CAMPOS_IMAGEN) {
    const url = valores[campo];
    if (url && (!url.startsWith(prefijo) || url.length > 500 || /[\s"'<>]/.test(url))) {
      return fallo(`La imagen del ${nombre} no es válida. Vuelve a subirla.`);
    }
  }
  if (fd.get("usar_icono_propio") === "1" && !valores.icono_sello_url) {
    return fallo("Sube el archivo del ícono del sello activo o desmarca “usar archivo propio”.");
  }
  if (fd.get("usar_icono_inactivo_propio") === "1" && !valores.icono_sello_inactivo_url) {
    return fallo("Sube el archivo del ícono del sello inactivo o desmarca “usar archivo propio”.");
  }

  for (const [campo, nombre] of CAMPOS_COLOR) {
    if (!COLOR_REGEX.test(valores[campo])) {
      return fallo(`El color de ${nombre} debe tener el formato #RRGGBB.`);
    }
  }
  if (!esIconoValido(valores.icono_sello) || !esIconoValido(valores.icono_sello_inactivo)) {
    return fallo("Elige los íconos de los sellos de la lista.");
  }
  if (!esTipoCodigoValido(valores.tipo_codigo)) {
    return fallo("Elige un tipo de código de la lista.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programas")
    .update({
      logo_horizontal_url: valores.logo_horizontal_url || null,
      logo_cuadrado_url: valores.logo_cuadrado_url || null,
      color_fondo: valores.color_fondo,
      color_etiquetas: valores.color_etiquetas,
      color_texto: valores.color_texto,
      icono_sello: valores.icono_sello,
      icono_sello_url: valores.icono_sello_url || null,
      icono_sello_inactivo: valores.icono_sello_inactivo,
      icono_sello_inactivo_url: valores.icono_sello_inactivo_url || null,
      color_sello_activo: valores.color_sello_activo,
      color_sello_inactivo: valores.color_sello_inactivo,
      color_fondo_sello: valores.color_fondo_sello,
      tipo_codigo: valores.tipo_codigo,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    if (error.code === "42501") return fallo("No tienes permiso para hacer este cambio.");
    return fallo(`No se pudo guardar el diseño: ${error.message}`);
  }
  if (!data || data.length === 0) {
    return fallo("El programa no existe o no es de tu cafetería.");
  }

  // Que la página (y la vista previa) muestren lo guardado
  refresh();
  return { error: null, guardado: true, valores: null };
}
