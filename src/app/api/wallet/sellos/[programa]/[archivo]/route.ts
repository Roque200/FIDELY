import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { disenoEfectivo, type CafeteriaDiseno, type ProgramaDiseno } from "@/lib/diseno";
import { imagenSellos } from "@/lib/imagen-sellos";

// Imagen de los sellos para la tarjeta en Google Wallet (y Apple Wallet después).
// /api/wallet/sellos/<programa>/<sellos>.png?v=<versión del diseño>
// No lleva datos del cliente: es la misma para todas las tarjetas del programa
// con los mismos sellos. El ?v= cambia con el diseño para que Google la renueve.

const TAMANOS = {
  google: { ancho: 1032, alto: 336 },
} as const;

const PREFIJO_IMAGENES = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/disenos/`;

// Descarga un ícono propio y lo regresa como data URI. Si falla (o no es del
// almacenamiento de Fidely) regresa null y se usa el ícono del catálogo:
// la imagen de sellos nunca debe romperse por un ícono.
async function iconoPropio(url: string | null): Promise<string | null> {
  if (!url || !url.startsWith(PREFIJO_IMAGENES)) return null;
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const tipo = respuesta.headers.get("content-type") ?? "";
    if (!respuesta.ok || !["image/png", "image/jpeg"].includes(tipo)) return null;
    const datos = Buffer.from(await respuesta.arrayBuffer());
    if (datos.byteLength > 1024 * 1024) return null;
    return `data:${tipo};base64,${datos.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programa: string; archivo: string }> },
) {
  const { programa: programaId, archivo } = await params;
  const coincidencia = /^(\d{1,2})\.png$/.exec(archivo);
  if (!/^[0-9a-f-]{36}$/.test(programaId) || !coincidencia) {
    return new Response("No encontrado", { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("programas")
    .select(
      "sellos_requeridos, logo_horizontal_url, logo_cuadrado_url, color_fondo, color_etiquetas, color_texto, icono_sello, icono_sello_url, icono_sello_inactivo, icono_sello_inactivo_url, color_sello_activo, color_sello_inactivo, color_fondo_sello, tipo_codigo, cafeterias ( nombre, logo_url, color_fondo, color_texto, color_etiquetas )",
    )
    .eq("id", programaId)
    .maybeSingle();

  if (error) return new Response("Error", { status: 500 });
  if (!data) return new Response("No encontrado", { status: 404 });

  const cafeteria = (Array.isArray(data.cafeterias) ? data.cafeterias[0] : data.cafeterias) as
    | CafeteriaDiseno
    | null;
  if (!cafeteria) return new Response("No encontrado", { status: 404 });

  const total = data.sellos_requeridos as number;
  const llenos = Math.min(Number(coincidencia[1]), total);
  const tamano = TAMANOS.google;

  const diseno = disenoEfectivo(cafeteria, data as ProgramaDiseno);
  const [activo, inactivo] = await Promise.all([
    iconoPropio(diseno.iconoSelloUrl),
    iconoPropio(diseno.iconoSelloInactivoUrl),
  ]);
  diseno.iconoSelloUrl = activo;
  diseno.iconoSelloInactivoUrl = inactivo;

  const imagen = imagenSellos({
    diseno,
    total,
    llenos,
    ...tamano,
  });

  // Con ?v= la dirección cambia con el diseño: se puede guardar en caché mucho tiempo
  const versionada = request.nextUrl.searchParams.has("v");
  imagen.headers.set(
    "Cache-Control",
    versionada ? "public, max-age=31536000, immutable" : "public, max-age=300",
  );
  return imagen;
}
