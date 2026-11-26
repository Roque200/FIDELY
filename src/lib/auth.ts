import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RolStaff = "dueno" | "barista";

type DatosStaff = {
  userId: string;
  correo: string | null;
  nombre: string;
  cafeteriaId: string;
  sucursalId: string | null;
};

export type Perfil =
  | {
      tipo: "admin";
      userId: string;
      correo: string | null;
    }
  | (DatosStaff & { tipo: "dueno" })
  | (DatosStaff & { tipo: "barista" })
  | {
      // Tiene sesión pero no es admin ni staff activo
      tipo: "sin_acceso";
      userId: string;
      correo: string | null;
    };

export type TipoPerfil = Perfil["tipo"];

// Lee el usuario de la sesión y busca si es super admin o staff.
// cache() hace que solo se consulte una vez por request.
export const getPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const userId = claims.sub;
  const correo = typeof claims.email === "string" ? claims.email : null;

  const { data: admin, error: errorAdmin } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  // Si la base falla no hay que decirle "sin acceso": mejor mostrar el error
  if (errorAdmin) {
    throw new Error(`No se pudo leer super_admins: ${errorAdmin.message}`);
  }

  if (admin) {
    return { tipo: "admin", userId, correo };
  }

  // RLS solo deja ver el registro si el staff está activo
  const { data: staff, error: errorStaff } = await supabase
    .from("staff")
    .select("nombre, rol, cafeteria_id, sucursal_id, activo")
    .eq("id", userId)
    .maybeSingle();

  if (errorStaff) {
    throw new Error(`No se pudo leer staff: ${errorStaff.message}`);
  }

  if (!staff || !staff.activo) {
    return { tipo: "sin_acceso", userId, correo };
  }

  return {
    tipo: staff.rol as RolStaff,
    userId,
    correo,
    nombre: staff.nombre as string,
    cafeteriaId: staff.cafeteria_id as string,
    sucursalId: (staff.sucursal_id as string | null) ?? null,
  };
});

// A dónde va cada quien después de iniciar sesión
export function rutaInicio(tipo: TipoPerfil): string {
  switch (tipo) {
    case "admin":
      return "/admin";
    case "dueno":
      return "/panel";
    case "barista":
      return "/barista";
    default:
      return "/login?error=sin-acceso";
  }
}

// Protege una página o layout: si no tiene sesión lo manda al login,
// y si su rol no está permitido lo manda a su propia sección.
export async function requireRol<T extends Exclude<TipoPerfil, "sin_acceso">>(
  ...roles: T[]
): Promise<Extract<Perfil, { tipo: T }>> {
  const perfil = await getPerfil();

  if (!perfil) {
    redirect("/login");
  }

  if (perfil.tipo === "sin_acceso") {
    redirect("/login?error=sin-acceso");
  }

  if (!(roles as TipoPerfil[]).includes(perfil.tipo)) {
    redirect(rutaInicio(perfil.tipo));
  }

  return perfil as Extract<Perfil, { tipo: T }>;
}
