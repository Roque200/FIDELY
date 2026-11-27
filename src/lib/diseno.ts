import {
  Award,
  Bean,
  CakeSlice,
  CircleCheck,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  Crown,
  CupSoda,
  Donut,
  Flame,
  Flower2,
  Gift,
  Heart,
  IceCreamCone,
  Leaf,
  PawPrint,
  Sandwich,
  Smile,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { mezclarColores } from "@/lib/colores";

// Catálogo de íconos para los sellos (la clave es lo que se guarda en la base)
export const ICONOS_SELLO = {
  cafe: { etiqueta: "Taza de café", Icono: Coffee },
  grano: { etiqueta: "Grano de café", Icono: Bean },
  vaso: { etiqueta: "Vaso", Icono: CupSoda },
  estrella: { etiqueta: "Estrella", Icono: Star },
  corazon: { etiqueta: "Corazón", Icono: Heart },
  palomita: { etiqueta: "Palomita", Icono: CircleCheck },
  dona: { etiqueta: "Dona", Icono: Donut },
  cuernito: { etiqueta: "Cuernito", Icono: Croissant },
  pastel: { etiqueta: "Pastel", Icono: CakeSlice },
  galleta: { etiqueta: "Galleta", Icono: Cookie },
  helado: { etiqueta: "Helado", Icono: IceCreamCone },
  sandwich: { etiqueta: "Sándwich", Icono: Sandwich },
  citrico: { etiqueta: "Cítrico", Icono: Citrus },
  hoja: { etiqueta: "Hoja", Icono: Leaf },
  flor: { etiqueta: "Flor", Icono: Flower2 },
  huella: { etiqueta: "Huella", Icono: PawPrint },
  regalo: { etiqueta: "Regalo", Icono: Gift },
  medalla: { etiqueta: "Medalla", Icono: Award },
  corona: { etiqueta: "Corona", Icono: Crown },
  carita: { etiqueta: "Carita", Icono: Smile },
  brillos: { etiqueta: "Brillos", Icono: Sparkles },
  flama: { etiqueta: "Flama", Icono: Flame },
} satisfies Record<string, { etiqueta: string; Icono: LucideIcon }>;

export type ClaveIcono = keyof typeof ICONOS_SELLO;

export function esIconoValido(clave: string): clave is ClaveIcono {
  return Object.hasOwn(ICONOS_SELLO, clave);
}

// Tipos de código que aceptan Apple y Google Wallet
export const TIPOS_CODIGO = {
  qr: { etiqueta: "QR", ayuda: "El más común; lo lee cualquier cámara." },
  aztec: { etiqueta: "Aztec", ayuda: "Cuadrado y compacto, como en boletos de avión." },
  pdf417: { etiqueta: "PDF417", ayuda: "Rectangular, como en credenciales." },
  code128: {
    etiqueta: "Code 128",
    ayuda: "Barras de líneas. Es el más difícil de leer con cámara; mejor usa QR si puedes.",
  },
} as const;

export type TipoCodigo = keyof typeof TIPOS_CODIGO;

export function esTipoCodigoValido(tipo: string): tipo is TipoCodigo {
  return Object.hasOwn(TIPOS_CODIGO, tipo);
}

// Lo que necesita la tarjeta para dibujarse
export type DisenoTarjeta = {
  nombreCafeteria: string;
  logoHorizontal: string | null;
  logoCuadrado: string | null;
  colorFondo: string;
  colorEtiquetas: string;
  colorTexto: string;
  iconoSello: ClaveIcono;
  iconoSelloUrl: string | null;
  iconoSelloInactivo: ClaveIcono;
  iconoSelloInactivoUrl: string | null;
  colorSelloActivo: string;
  colorSelloInactivo: string;
  colorFondoSello: string;
  tipoCodigo: TipoCodigo;
};

export type CafeteriaDiseno = {
  nombre: string;
  logo_url: string | null;
  color_fondo: string;
  color_texto: string;
  color_etiquetas: string;
};

export type ProgramaDiseno = {
  logo_horizontal_url?: string | null;
  logo_cuadrado_url?: string | null;
  color_fondo?: string | null;
  color_etiquetas?: string | null;
  color_texto?: string | null;
  icono_sello?: string | null;
  icono_sello_url?: string | null;
  icono_sello_inactivo?: string | null;
  icono_sello_inactivo_url?: string | null;
  color_sello_activo?: string | null;
  color_sello_inactivo?: string | null;
  color_fondo_sello?: string | null;
  tipo_codigo?: string | null;
};

// Diseño final de la tarjeta: lo del programa y, si no tiene, lo de la cafetería
export function disenoEfectivo(
  cafeteria: CafeteriaDiseno,
  programa: ProgramaDiseno = {},
): DisenoTarjeta {
  const icono = (v: string | null | undefined): ClaveIcono =>
    v && esIconoValido(v) ? v : "cafe";

  const colorFondo = programa.color_fondo ?? cafeteria.color_fondo;
  const colorTexto = programa.color_texto ?? cafeteria.color_texto;

  return {
    nombreCafeteria: cafeteria.nombre,
    logoHorizontal: programa.logo_horizontal_url ?? cafeteria.logo_url ?? null,
    logoCuadrado: programa.logo_cuadrado_url ?? null,
    colorFondo,
    colorEtiquetas: programa.color_etiquetas ?? cafeteria.color_etiquetas,
    colorTexto,
    iconoSello: icono(programa.icono_sello),
    iconoSelloUrl: programa.icono_sello_url ?? null,
    iconoSelloInactivo: icono(programa.icono_sello_inactivo),
    iconoSelloInactivoUrl: programa.icono_sello_inactivo_url ?? null,
    // Si no los eligió, se calculan a partir de los colores de la tarjeta
    colorSelloActivo: programa.color_sello_activo ?? colorTexto,
    colorSelloInactivo:
      programa.color_sello_inactivo ?? mezclarColores(colorTexto, colorFondo, 0.55),
    colorFondoSello:
      programa.color_fondo_sello ?? mezclarColores(colorFondo, "#000000", 0.12),
    tipoCodigo:
      programa.tipo_codigo && esTipoCodigoValido(programa.tipo_codigo)
        ? programa.tipo_codigo
        : "qr",
  };
}

export const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
