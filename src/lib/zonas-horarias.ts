// Zonas horarias de México (la cafetería las usa para el límite de sellos por día)
export const ZONAS_HORARIAS = [
  { valor: "America/Mexico_City", etiqueta: "Centro (CDMX, Guadalajara, Puebla)" },
  { valor: "America/Monterrey", etiqueta: "Monterrey" },
  { valor: "America/Merida", etiqueta: "Mérida" },
  { valor: "America/Cancun", etiqueta: "Quintana Roo (Cancún)" },
  { valor: "America/Chihuahua", etiqueta: "Chihuahua" },
  { valor: "America/Ciudad_Juarez", etiqueta: "Ciudad Juárez" },
  { valor: "America/Mazatlan", etiqueta: "Pacífico (Mazatlán, La Paz, Tepic)" },
  { valor: "America/Hermosillo", etiqueta: "Sonora (Hermosillo)" },
  { valor: "America/Tijuana", etiqueta: "Baja California (Tijuana, Mexicali)" },
] as const;

export function esZonaValida(valor: string) {
  return ZONAS_HORARIAS.some((z) => z.valor === valor);
}
