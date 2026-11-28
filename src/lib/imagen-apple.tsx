import "server-only";
import { ImageResponse } from "next/og";
import type { DisenoTarjeta } from "@/lib/diseno";
import { iconoDataUri } from "@/lib/imagen-sellos";

// Ancho y alto de una imagen PNG o JPEG (data URI) leyendo su encabezado
function dimensiones(dataUri: string): { ancho: number; alto: number } | null {
  const datos = Buffer.from(dataUri.slice(dataUri.indexOf(",") + 1), "base64");
  if (datos.length > 24 && datos.readUInt32BE(0) === 0x89504e47) {
    return { ancho: datos.readUInt32BE(16), alto: datos.readUInt32BE(20) };
  }
  if (datos.length > 4 && datos[0] === 0xff && datos[1] === 0xd8) {
    let i = 2;
    while (i + 9 < datos.length) {
      if (datos[i] !== 0xff) return null;
      const marca = datos[i + 1];
      const largo = datos.readUInt16BE(i + 2);
      // SOF0..SOF15 (menos DHT, JPG y DAC): ahí vienen las medidas
      if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) {
        return { alto: datos.readUInt16BE(i + 5), ancho: datos.readUInt16BE(i + 7) };
      }
      i += 2 + largo;
    }
  }
  return null;
}

// Logo del pase de Apple Wallet: la imagen de la cafetería ajustada al
// espacio del logo sin deformarla, pegada a la izquierda y con fondo
// transparente (Apple lo pone arriba a la izquierda)
export function imagenLogo(logo: string, ancho: number, alto: number) {
  const medidas = dimensiones(logo);
  const escala = medidas ? Math.min(ancho / medidas.ancho, alto / medidas.alto) : 1;
  const w = medidas ? Math.max(1, Math.round(medidas.ancho * escala)) : alto;
  const h = medidas ? Math.max(1, Math.round(medidas.alto * escala)) : alto;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={w} height={h} />
      </div>
    ),
    { width: ancho, height: alto },
  );
}

// Ícono del pase (notificaciones y pantalla de bloqueo): el logo cuadrado
// si lo subieron; si no, el ícono del sello sobre el color de la tarjeta
export function imagenIcono(d: DisenoTarjeta, logoCuadrado: string | null, lado: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: logoCuadrado ? "transparent" : d.colorFondo,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoCuadrado ?? iconoDataUri(d.iconoSello, d.colorTexto)}
          alt=""
          width={logoCuadrado ? lado : Math.round(lado * 0.62)}
          height={logoCuadrado ? lado : Math.round(lado * 0.62)}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { width: lado, height: lado },
  );
}
