import "server-only";

const PREFIJO_IMAGENES = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/disenos/`;

// Descarga una imagen subida a Fidely (logo, ícono) y la regresa como data
// URI para dibujarla en otra imagen. Si falla, o no es del almacenamiento de
// Fidely, regresa null: quien la usa pone algo de respaldo y nunca se rompe.
export async function imagenDeStorage(url: string | null): Promise<string | null> {
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
