"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
