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

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
