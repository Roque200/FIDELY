// Zonas horarias de México (la cafetería las usa para el límite de sellos por día).
// Desde 2022 no hay horario de verano en México, salvo en la frontera norte.
export const ZONAS_HORARIAS = [
  {
    valor: "America/Mexico_City",
    etiqueta: "Centro (UTC−6)",
    estados:
      "Aguascalientes, Campeche, Chiapas, Ciudad de México, Coahuila, Colima, Durango, Estado de México, Guanajuato, Guerrero, Hidalgo, Jalisco, Michoacán, Morelos, Nayarit (Bahía de Banderas), Nuevo León, Oaxaca, Puebla, Querétaro, San Luis Potosí, Tabasco, Tamaulipas, Tlaxcala, Veracruz, Yucatán y Zacatecas.",
  },
  {
    valor: "America/Cancun",
    etiqueta: "Sureste (UTC−5)",
    estados: "Quintana Roo.",
  },
  {
    valor: "America/Chihuahua",
    etiqueta: "Chihuahua (UTC−6)",
    estados: "Chihuahua, excepto Ciudad Juárez y la frontera.",
  },
  {
    valor: "America/Mazatlan",
    etiqueta: "Pacífico (UTC−7)",
    estados: "Baja California Sur, Sinaloa y Nayarit (excepto Bahía de Banderas).",
  },
  {
    valor: "America/Hermosillo",
    etiqueta: "Sonora (UTC−7)",
    estados: "Sonora.",
  },
  {
    valor: "America/Tijuana",
    etiqueta: "Noroeste (UTC−8, con horario de verano)",
    estados: "Baja California.",
  },
  {
    valor: "America/Ciudad_Juarez",
    etiqueta: "Ciudad Juárez (con horario de verano)",
    estados: "Ciudad Juárez y la frontera de Chihuahua.",
  },
  {
    valor: "America/Matamoros",
    etiqueta: "Frontera noreste (con horario de verano)",
    estados:
      "Municipios fronterizos de Tamaulipas, Nuevo León y Coahuila (Matamoros, Reynosa, Nuevo Laredo, Piedras Negras, Acuña…).",
  },
] as const;

// Zonas que se ofrecían antes; siguen siendo válidas para no romper
// las cafeterías que ya las tienen (dan la misma hora que Centro).
const ZONAS_ANTERIORES: Record<string, string> = {
  "America/Monterrey": "Monterrey (misma hora que Centro)",
  "America/Merida": "Mérida (misma hora que Centro)",
};

export function esZonaValida(valor: string) {
  return (
    ZONAS_HORARIAS.some((z) => z.valor === valor) || valor in ZONAS_ANTERIORES
  );
}

export function etiquetaZonaAnterior(valor: string) {
  return ZONAS_ANTERIORES[valor] ?? valor;
}
