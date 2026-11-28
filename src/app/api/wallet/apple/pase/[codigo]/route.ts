import { NextResponse, type NextRequest } from "next/server";
import { paseParaCodigo } from "@/lib/apple-wallet";
import { origenActual } from "@/lib/origen";

// "Agregar a Apple Wallet": descarga el .pkpass de la tarjeta; Safari lo
// abre y ofrece agregarlo. El código de la tarjeta funciona como llave.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params;
  const origen = await origenActual();
  const volver = (motivo: string) =>
    NextResponse.redirect(new URL(`/t/${codigo}?wallet=${motivo}`, origen), 303);

  if (!/^[0-9a-f]{32}$/.test(codigo)) {
    return NextResponse.redirect(new URL("/", origen), 303);
  }

  try {
    const resultado = await paseParaCodigo(codigo, origen);
    if (!resultado) return volver("apple-no-disponible");
    return new Response(new Uint8Array(resultado.pase), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="tarjeta.pkpass"',
        "Last-Modified": resultado.modificado.toUTCString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Error al generar la tarjeta de Apple Wallet:", e);
    return volver("apple-error");
  }
}
