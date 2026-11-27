// Mismo formato que la constraint slug_formato de la base
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// "Café La Esquina!" -> "cafe-la-esquina"
export function crearSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
