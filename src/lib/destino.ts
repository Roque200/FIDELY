// Solo rutas internas (evita redirecciones a otros sitios).
// Se interpreta igual que el navegador: "/\evil.com" o "//evil.com"
// apuntan a otro dominio, así que se descartan.
export function destinoSeguro(next: string | null | undefined) {
  if (!next || !next.startsWith("/")) return "/";
  const base = "http://fidely.interno";
  try {
    const url = new URL(next, base);
    if (url.origin !== base) return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}
