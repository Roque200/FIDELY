import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CafeteriaDiseno, ProgramaDiseno } from "@/lib/diseno";

// Lecturas para las páginas públicas (sin sesión). Usan la llave de servicio,
// así que solo regresan lo que es público: nunca datos de otros clientes.

const COLUMNAS_DISENO =
  "logo_horizontal_url, logo_cuadrado_url, color_fondo, color_etiquetas, color_texto, icono_sello, icono_sello_url, icono_sello_inactivo, icono_sello_inactivo_url, color_sello_activo, color_sello_inactivo, color_fondo_sello, tipo_codigo";

export type ProgramaPublico = ProgramaDiseno & {
  id: string;
  nombre: string;
  descripcion: string | null;
  premio: string;
  sellos_requeridos: number;
};

export type CafeteriaPublica = {
  id: string;
  slug: string;
  cafeteria: CafeteriaDiseno;
  // Solo programas activos; vacío si la suscripción no está vigente
  programas: ProgramaPublico[];
};

// Cafetería y sus programas activos para la página de registro /c/[slug]
export async function cafeteriaPublica(slug: string): Promise<CafeteriaPublica | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return null;

  const admin = createAdminClient();
  const { data: cafeteria, error } = await admin
    .from("cafeterias")
    .select("id, slug, nombre, logo_url, color_fondo, color_texto, color_etiquetas, estado_suscripcion")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la cafetería: ${error.message}`);
  if (!cafeteria) return null;

  const vigente = ["prueba", "activa"].includes(cafeteria.estado_suscripcion as string);

  let programas: ProgramaPublico[] = [];
  if (vigente) {
    const { data, error: errorProgramas } = await admin
      .from("programas")
      .select(`id, nombre, descripcion, premio, sellos_requeridos, ${COLUMNAS_DISENO}`)
      .eq("cafeteria_id", cafeteria.id)
      .eq("activo", true)
      .order("creado_en");
    if (errorProgramas) {
      throw new Error(`No se pudieron leer los programas: ${errorProgramas.message}`);
    }
    programas = (data ?? []) as ProgramaPublico[];
  }

  return {
    id: cafeteria.id as string,
    slug: cafeteria.slug as string,
    cafeteria: {
      nombre: cafeteria.nombre as string,
      logo_url: (cafeteria.logo_url as string | null) ?? null,
      color_fondo: cafeteria.color_fondo as string,
      color_texto: cafeteria.color_texto as string,
      color_etiquetas: cafeteria.color_etiquetas as string,
    },
    programas,
  };
}

export type TarjetaPublica = {
  codigo: string;
  sellos: number;
  premiosCanjeados: number;
  cliente: string;
  slug: string;
  cafeteria: CafeteriaDiseno;
  programa: ProgramaPublico & { activo: boolean };
};

// Tarjeta del cliente para /t/[codigo]. El código (32 caracteres al azar)
// funciona como llave: quien lo tiene puede ver la tarjeta.
export async function tarjetaPublica(codigo: string): Promise<TarjetaPublica | null> {
  if (!/^[0-9a-f]{32}$/.test(codigo)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tarjetas")
    .select(
      `codigo, sellos_actuales, premios_canjeados,
       clientes ( nombre ),
       cafeterias ( slug, nombre, logo_url, color_fondo, color_texto, color_etiquetas ),
       programas ( id, nombre, descripcion, premio, sellos_requeridos, activo, ${COLUMNAS_DISENO} )`,
    )
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la tarjeta: ${error.message}`);
  if (!data) return null;

  // Relaciones muchos-a-uno: Supabase las regresa como objeto
  const uno = <T,>(x: unknown): T | null =>
    ((Array.isArray(x) ? x[0] : x) as T | undefined) ?? null;
  const cliente = uno<{ nombre: string }>(data.clientes);
  const cafeteria = uno<CafeteriaDiseno & { slug: string }>(data.cafeterias);
  const programa = uno<ProgramaPublico & { activo: boolean }>(data.programas);
  if (!cliente || !cafeteria || !programa) return null;

  const { slug, ...diseno } = cafeteria;
  return {
    codigo: data.codigo as string,
    sellos: data.sellos_actuales as number,
    premiosCanjeados: data.premios_canjeados as number,
    cliente: cliente.nombre,
    slug,
    cafeteria: diseno,
    programa,
  };
}
