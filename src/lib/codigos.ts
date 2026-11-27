import "server-only";
import bwipjs from "bwip-js/node";
import type { TipoCodigo } from "@/lib/diseno";

const BCID: Record<TipoCodigo, string> = {
  qr: "qrcode",
  aztec: "azteccode",
  pdf417: "pdf417",
  code128: "code128",
};

// Dibuja el código (QR, Aztec, PDF417 o Code 128) como SVG
export function generarCodigoSvg(tipo: TipoCodigo, valor: string) {
  return bwipjs.toSVG({
    bcid: BCID[tipo],
    text: valor,
    scale: 3,
    // Code 128 lleva el texto debajo en las tarjetas reales; en la vista previa no hace falta
    includetext: false,
    ...(tipo === "pdf417" ? { columns: 4 } : {}),
    ...(tipo === "code128" ? { height: 12 } : {}),
  });
}

// Los 4 tipos a la vez (para que la vista previa cambie sin ir al servidor)
export function generarTodosLosCodigos(valor: string): Record<TipoCodigo, string> {
  return {
    qr: generarCodigoSvg("qr", valor),
    aztec: generarCodigoSvg("aztec", valor),
    pdf417: generarCodigoSvg("pdf417", valor),
    code128: generarCodigoSvg("code128", valor),
  };
}
