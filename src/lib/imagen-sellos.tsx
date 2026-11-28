import "server-only";
import { ImageResponse } from "next/og";
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
  type IconNode,
} from "lucide";
import type { ClaveIcono, DisenoTarjeta } from "@/lib/diseno";

// Los mismos íconos del catálogo (lib/diseno.ts), en versión sin React
const NODOS: Record<ClaveIcono, IconNode> = {
  cafe: Coffee,
  grano: Bean,
  vaso: CupSoda,
  estrella: Star,
  corazon: Heart,
  palomita: CircleCheck,
  dona: Donut,
  cuernito: Croissant,
  pastel: CakeSlice,
  galleta: Cookie,
  helado: IceCreamCone,
  sandwich: Sandwich,
  citrico: Citrus,
  hoja: Leaf,
  flor: Flower2,
  huella: PawPrint,
  regalo: Gift,
  medalla: Award,
  corona: Crown,
  carita: Smile,
  brillos: Sparkles,
  flama: Flame,
};

const escapar = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Ícono como imagen SVG (data URI) del color pedido
export function iconoDataUri(clave: ClaveIcono, color: string) {
  const hijos = NODOS[clave]
    .map(([etiqueta, atributos]) => {
      const attrs = Object.entries(atributos)
        .map(([k, v]) => ` ${k}="${escapar(String(v))}"`)
        .join("");
      return `<${etiqueta}${attrs}/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${hijos}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

type Opciones = {
  diseno: DisenoTarjeta;
  total: number;
  llenos: number;
  ancho: number;
  alto: number;
};

// Imagen PNG con los sellos de la tarjeta (Google Wallet "heroImage";
// también sirve para el "strip" de Apple Wallet)
export function imagenSellos({ diseno, total, llenos, ancho, alto }: Opciones) {
  const margen = Math.round(alto * 0.12);
  const espacio = Math.round(alto * 0.07);

  if (total > 10) {
    const porcentaje = Math.min(100, (llenos / total) * 100);
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: `0 ${margen * 2}px`,
            backgroundColor: diseno.colorFondoSello,
            color: diseno.colorSelloActivo,
          }}
        >
          <div style={{ display: "flex", fontSize: Math.round(alto * 0.3), fontWeight: 700 }}>
            {`${llenos} / ${total}`}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: Math.round(alto * 0.06),
              height: Math.round(alto * 0.09),
              width: "100%",
              borderRadius: 999,
              backgroundColor: diseno.colorSelloInactivo,
            }}
          >
            <div
              style={{
                display: "flex",
                width: `${porcentaje}%`,
                height: "100%",
                borderRadius: 999,
                backgroundColor: diseno.colorSelloActivo,
              }}
            />
          </div>
        </div>
      ),
      { width: ancho, height: alto },
    );
  }

  const filas = total <= 5 ? 1 : 2;
  const porFila = Math.ceil(total / filas);
  const diametro = Math.floor(
    Math.min(
      (alto - 2 * margen - (filas - 1) * espacio) / filas,
      (ancho - 2 * margen - (porFila - 1) * espacio) / porFila,
      alto * 0.5,
    ),
  );
  const borde = Math.max(3, Math.round(diametro * 0.05));

  const sello = (i: number) => {
    const lleno = i < llenos;
    const color = lleno ? diseno.colorSelloActivo : diseno.colorSelloInactivo;
    const url = lleno ? diseno.iconoSelloUrl : diseno.iconoSelloInactivoUrl;
    const icono = lleno ? diseno.iconoSello : diseno.iconoSelloInactivo;
    const tamano = Math.round(diametro * (url ? 0.6 : 0.5));
    return (
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: diametro,
          height: diametro,
          borderRadius: "50%",
          border: `${borde}px solid ${color}`,
          backgroundColor: lleno ? color : "transparent",
          marginLeft: i % porFila === 0 ? 0 : espacio,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url ?? iconoDataUri(icono, lleno ? diseno.colorFondoSello : color)}
          width={tamano}
          height={tamano}
          alt=""
          style={{ objectFit: "contain" }}
        />
      </div>
    );
  };

  const filasDeSellos = Array.from({ length: filas }, (_, f) => {
    const desde = f * porFila;
    const hasta = Math.min(total, desde + porFila);
    return (
      <div
        key={f}
        style={{ display: "flex", marginTop: f === 0 ? 0 : espacio }}
      >
        {Array.from({ length: hasta - desde }, (_, j) => sello(desde + j))}
      </div>
    );
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: diseno.colorFondoSello,
        }}
      >
        {filasDeSellos}
      </div>
    ),
    { width: ancho, height: alto },
  );
}
