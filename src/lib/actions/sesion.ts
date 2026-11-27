"use server";

import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/destino";

export type EstadoLogin = {
  error: string | null;
  correo: string;
};

export async function iniciarSesion(
  _estadoAnterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!correo || !password) {
    return { error: "Escribe tu correo y tu contraseña.", correo };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password,
  });

  if (error) {
    return { error: "Correo o contraseña incorrectos.", correo };
  }

  // La página de inicio revisa el rol y lo manda a su sección
  redirect("/");
}

export type EstadoContrasena = {
  error: string | null;
};

// El dueño (o barista) invitado crea su contraseña
export async function definirContrasena(
  _estadoAnterior: EstadoContrasena,
  formData: FormData,
): Promise<EstadoContrasena> {
  const password = String(formData.get("password") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirmacion) {
    return { error: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "Tu sesión venció. Pide un link nuevo de invitación." };
  }

  // contrasena_definida: así el admin sabe que ya no está pendiente
  const { error } = await supabase.auth.updateUser({
    password,
    data: { contrasena_definida: true },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { error: "Esa contraseña es muy débil. Usa una más larga o con más variedad." };
    }
    if (error.code === "same_password") {
      return { error: "Usa una contraseña diferente a la anterior." };
    }
    return { error: `No se pudo guardar la contraseña: ${error.message}` };
  }

  // La página de inicio revisa el rol y lo manda a su sección
  redirect("/");
}

const TIPOS_LINK: EmailOtpType[] = ["invite", "magiclink", "email", "recovery"];

// Usa el link de invitación o de acceso. Se llama al presionar "Continuar"
// (no al abrir el link) para que las vistas previas de WhatsApp, correo, etc.
// no gasten el link de un solo uso.
export async function confirmarLink(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const tipo = String(formData.get("type") ?? "") as EmailOtpType;
  const next = destinoSeguro(String(formData.get("next") ?? ""));

  if (!tokenHash || !TIPOS_LINK.includes(tipo)) {
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

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
