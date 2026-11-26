import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todo excepto archivos estáticos, imágenes y las rutas de Wallet
    // (Apple y Google llaman a esas rutas sin sesión de usuario).
    "/((?!_next/static|_next/image|favicon.ico|api/wallet|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
