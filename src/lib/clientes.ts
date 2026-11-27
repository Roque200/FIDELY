import { normalizarTelefono } from "@/lib/telefono";

// Una relación de Supabase puede venir como objeto o como arreglo
export function uno<T>(valor: unknown): T | null {
  if (Array.isArray(valor)) return (valor[0] as T) ?? null;
  return (valor as T) ?? null;
}

// "5512345678" -> "55 1234 5678"
export function telefonoLegible(telefono: string | null) {
  if (!telefono) return null;
  return telefono.length === 10
    ? `${telefono.slice(0, 2)} ${telefono.slice(2, 6)} ${telefono.slice(6)}`
    : telefono;
}

// Filtro para buscar clientes por nombre, correo o teléfono (formato de
// PostgREST "or"). Se quitan los caracteres que rompen el filtro (comas,
// paréntesis, comodines) para que lo que escriba el dueño no lo altere.
export function filtroBusqueda(texto: string): string | null {
  const limpio = texto
    .replace(/[^\p{L}\p{N}@.\-+' ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpio) return null;

  const filtros = [`nombre.ilike.%${limpio}%`, `correo.ilike.%${limpio}%`];
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length >= 3) {
    filtros.push(`telefono.ilike.%${normalizarTelefono(digitos) ?? digitos}%`);
  }
  return filtros.join(",");
}

export function formatoFecha(zonaHoraria: string, conHora = true) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: zonaHoraria,
    dateStyle: "medium",
    ...(conHora ? { timeStyle: "short" } : {}),
  });
}
