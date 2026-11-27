import QRCode from "qrcode";
import {
  TarjetaVisual,
  type DatosPrograma,
  type DisenoCafeteria,
} from "./tarjeta-visual";

export type { DatosPrograma, DisenoCafeteria };

// Genera el QR como SVG (en el servidor)
export async function generarQrSvg(valor: string) {
  return QRCode.toString(valor, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
  });
}

type Props = {
  cafeteria: DisenoCafeteria;
  programa: DatosPrograma;
  // Lo que va dentro del QR (en la tarjeta real es tarjetas.codigo)
  valorQr: string;
  // Sellos que se pintan como ejemplo en la vista previa
  sellosMuestra?: number;
};

// Tarjeta de Wallet con su QR generado en el servidor
export async function TarjetaWallet({ valorQr, ...resto }: Props) {
  const qr = await generarQrSvg(valorQr);
  return <TarjetaVisual qr={qr} {...resto} />;
}
