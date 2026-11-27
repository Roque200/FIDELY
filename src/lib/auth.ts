import "server-only";
import { cache } from "react";
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

type RolPermitido = Exclude<TipoPerfil, "sin_acceso">;

export type ResultadoAcceso<T extends RolPermitido> =
  | { permitido: true; perfil: Extract<Perfil, { tipo: T }> }
  | { permitido: false; destino: string };

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

// Revisa si el usuario puede entrar a una sección.
// No redirige: regresa a dónde mandarlo y el layout se encarga.
// (Redirigir durante el render rompe la validación de Next en modo dev.)
export async function verificarAcceso<T extends RolPermitido>(
  ...roles: T[]
): Promise<ResultadoAcceso<T>> {
  const perfil = await getPerfil();

  if (!perfil) {
    return { permitido: false, destino: "/login" };
  }

  if (perfil.tipo === "sin_acceso") {
    return { permitido: false, destino: "/login?error=sin-acceso" };
  }

  if (!(roles as TipoPerfil[]).includes(perfil.tipo)) {
    return { permitido: false, destino: rutaInicio(perfil.tipo) };
  }

  return { permitido: true, perfil: perfil as Extract<Perfil, { tipo: T }> };
}
