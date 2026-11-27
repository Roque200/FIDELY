import "server-only";
import { headers } from "next/headers";

// URL base de la app a partir de la petición actual (ej. https://fidely.mx)
export async function origenActual() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Dirección pública para lo que Google (o Apple) descarga por su cuenta: logo,
// imagen de sellos y links de la tarjeta. Las direcciones propias de cada
// deploy de Vercel están protegidas y Google no puede abrirlas, así que en
// producción siempre se usa la dirección principal del proyecto.
export function origenPublico(origen: string) {
  const sitio = process.env.SITIO_URL;
  if (sitio) return sitio.replace(/\/+$/, "");
  const produccion = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === "production" && produccion) return `https://${produccion}`;
  return origen;
}
