import { NextResponse, type NextRequest } from "next/server";
import { linkGuardarGoogle } from "@/lib/google-wallet";
import { origenActual } from "@/lib/origen";

// "Agregar a Google Wallet": prepara la tarjeta en Google y manda al cliente
// a la página de Google para guardarla. El código de la tarjeta funciona
// como llave (solo lo tiene el dueño de la tarjeta).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params;
  // La dirección que usa el navegador (no la interna del servidor): va en los
  // links de la tarjeta y en "origins" del JWT, que Google valida
  const origen = await origenActual();
  const volver = (motivo: string) =>
    NextResponse.redirect(new URL(`/t/${codigo}?wallet=${motivo}`, origen), 303);

  if (!/^[0-9a-f]{32}$/.test(codigo)) {
    return NextResponse.redirect(new URL("/", origen), 303);
  }

  try {
    const link = await linkGuardarGoogle(codigo, origen);
    if (!link) return volver("no-disponible");
    return NextResponse.redirect(link, 303);
  } catch (e) {
    console.error("Error al preparar la tarjeta de Google Wallet:", e);
    return volver("error");
  }
}
