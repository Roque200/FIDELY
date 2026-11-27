// Teléfono de México a 10 dígitos: acepta "55 1234 5678", "+52 55...", "+52 1 55..."
export function normalizarTelefono(texto: string): string | null {
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 10) return digitos;
  if (digitos.length === 12 && digitos.startsWith("52")) return digitos.slice(2);
  if (digitos.length === 13 && digitos.startsWith("521")) return digitos.slice(3);
  return null;
}
