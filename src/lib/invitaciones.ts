import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { origenActual } from "@/lib/origen";

export type ResultadoLink =
  | { ok: true; link: string; userId: string }
  | { ok: false; error: string };

// Ya creó su contraseña (se marca en definirContrasena)
export function tieneContrasena(usuario: User | null | undefined) {
  return usuario?.user_metadata?.contrasena_definida === true;
}

// Genera un link de un solo uso para que el usuario cree su contraseña.
// - Correo nuevo: crea el usuario con una invitación.
// - Invitación pendiente: genera otra (la anterior deja de servir).
// - Si ya abrió un link antes pero no creó contraseña (permitirExistente):
//   genera un link de acceso directo.
// No manda correo: el link se comparte por WhatsApp o como sea.
export async function generarLinkInvitacion(
  correo: string,
  nombre: string,
  { permitirExistente = false }: { permitirExistente?: boolean } = {},
): Promise<ResultadoLink> {
  const admin = createAdminClient();

  let tipo: "invite" | "magiclink" = "invite";
  let { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: correo,
    options: { data: { nombre } },
  });

  if (error?.code === "email_exists" && permitirExistente) {
    tipo = "magiclink";
    ({ data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: correo,
    }));
  }

  if (error || !data.user) {
    if (error?.code === "email_exists") {
      return {
        ok: false,
        error: "Ese correo ya tiene una cuenta activa. Usa otro correo.",
      };
    }
    if (error?.code === "validation_failed") {
      return { ok: false, error: "El correo no es válido." };
    }
    return {
      ok: false,
      error: `No se pudo generar el link: ${error?.message ?? "sin usuario"}`,
    };
  }

  const origen = await origenActual();
  const params = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: tipo,
    next: "/bienvenida",
  });

  return {
    ok: true,
    link: `${origen}/auth/confirmar?${params.toString()}`,
    userId: data.user.id,
  };
}
