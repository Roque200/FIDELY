import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TIPOS_PERMITIDOS: EmailOtpType[] = ["invite", "magiclink", "email", "recovery"];

// Solo rutas internas (evita redirecciones a otros sitios).
// Se interpreta igual que el navegador: "/\evil.com" o "//evil.com"
// apuntan a otro dominio, así que se descartan.
function destinoSeguro(next: string | null) {
  if (!next || !next.startsWith("/")) return "/";
  const base = "http://fidely.interno";
  try {
    const url = new URL(next, base);
    if (url.origin !== base) return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}

// Recibe el link de invitación: valida el token, inicia la sesión
// y manda al usuario a crear su contraseña.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const tipo = params.get("type") as EmailOtpType | null;
  const next = destinoSeguro(params.get("next"));

  if (!tokenHash || !tipo || !TIPOS_PERMITIDOS.includes(tipo)) {
    redirect("/login?error=link-invalido");
  }

  const supabase = await createClient();

  // Si había otra sesión abierta en este navegador, se cierra primero
  await supabase.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.verifyOtp({
    type: tipo,
    token_hash: tokenHash,
  });

  if (error) {
    redirect("/login?error=link-invalido");
  }

  redirect(next);
}
