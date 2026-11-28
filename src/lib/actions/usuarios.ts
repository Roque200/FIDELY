"use server";

import { refresh } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generarLinkCambioContrasena,
  generarLinkInvitacion,
  tieneContrasena,
} from "@/lib/invitaciones";

const ID_REGEX = /^[0-9a-f-]{36}$/;
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(fd: FormData, campo: string) {
  return String(fd.get(campo) ?? "").trim();
}

async function perfilDueno() {
  const perfil = await getPerfil();
  return perfil?.tipo === "dueno" ? perfil : null;
}

// Sucursales activas de la cafetería (para validar la que eligieron)
async function sucursalesActivas(cafeteriaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sucursales")
    .select("id")
    .eq("cafeteria_id", cafeteriaId)
    .eq("activa", true);
  if (error) throw new Error(`No se pudieron leer las sucursales: ${error.message}`);
  return data.map((s) => s.id as string);
}

// ---------------------------------------------------------------------
//  Invitar barista
// ---------------------------------------------------------------------

export type ValoresBarista = {
  nombre: string;
  correo: string;
  sucursal_id: string;
};

export type EstadoInvitar = {
  error: string | null;
  valores: ValoresBarista;
  resultado: { nombre: string; correo: string; link: string } | null;
};

// Crea la cuenta del barista y regresa el link para que cree su contraseña.
// Las altas de staff las hace el backend (service role): el dueño no puede
// insertar en staff directamente.
export async function invitarBarista(
  _anterior: EstadoInvitar,
  fd: FormData,
): Promise<EstadoInvitar> {
  const valores: ValoresBarista = {
    nombre: texto(fd, "nombre").replace(/\s+/g, " "),
    correo: texto(fd, "correo").toLowerCase(),
    sucursal_id: texto(fd, "sucursal_id"),
  };
  const fallo = (error: string): EstadoInvitar => ({ error, valores, resultado: null });

  const perfil = await perfilDueno();
  if (!perfil) return fallo("No autorizado.");

  if (valores.nombre.length < 2 || valores.nombre.length > 80) {
    return fallo("El nombre debe tener entre 2 y 80 caracteres.");
  }
  if (!CORREO_REGEX.test(valores.correo) || valores.correo.length > 254) {
    return fallo("El correo no es válido.");
  }

  // Sucursal: la elegida (de su cafetería y activa) o, si no eligió y solo
  // hay una, esa.
  const activas = await sucursalesActivas(perfil.cafeteriaId);
  let sucursalId: string | null = null;
  if (valores.sucursal_id) {
    if (!activas.includes(valores.sucursal_id)) return fallo("Elige una sucursal de la lista.");
    sucursalId = valores.sucursal_id;
  } else if (activas.length === 1) {
    sucursalId = activas[0];
  }

  const admin = createAdminClient();

  // Si el correo ya es del personal (de cualquier cafetería) o del admin,
  // no se le genera link: invalidaría el suyo.
  const { data: usuarioExistente, error: errorBusqueda } = await admin.rpc(
    "usuario_id_por_correo",
    { p_correo: valores.correo },
  );
  if (errorBusqueda) return fallo(`No se pudo revisar el correo: ${errorBusqueda.message}`);
  if (usuarioExistente) {
    const [{ data: esStaff }, { data: esSuperAdmin }] = await Promise.all([
      admin.from("staff").select("cafeteria_id").eq("id", usuarioExistente).maybeSingle(),
      admin.from("super_admins").select("user_id").eq("user_id", usuarioExistente).maybeSingle(),
    ]);
    if (esStaff?.cafeteria_id === perfil.cafeteriaId) {
      return fallo("Esa persona ya está en tu personal.");
    }
    if (esStaff || esSuperAdmin) {
      return fallo("Ese correo ya tiene una cuenta en Fidely. Usa otro correo.");
    }
  }

  const invitacion = await generarLinkInvitacion(valores.correo, valores.nombre);
  if (!invitacion.ok) return fallo(invitacion.error);

  const { error: errorStaff } = await admin.from("staff").insert({
    id: invitacion.userId,
    cafeteria_id: perfil.cafeteriaId,
    sucursal_id: sucursalId,
    nombre: valores.nombre,
    rol: "barista",
  });
  if (errorStaff) {
    // Deshacer para no dejar una cuenta sin registro de staff
    await admin.auth.admin.deleteUser(invitacion.userId);
    if (errorStaff.code === "23505") {
      return fallo("Ese correo ya tiene una cuenta en Fidely. Usa otro correo.");
    }
    return fallo(`No se pudo registrar al barista: ${errorStaff.message}`);
  }

  return {
    error: null,
    valores,
    resultado: { nombre: valores.nombre, correo: valores.correo, link: invitacion.link },
  };
}

// ---------------------------------------------------------------------
//  Editar barista (nombre y sucursal)
// ---------------------------------------------------------------------

export type EstadoEditar = {
  error: string | null;
  guardado: boolean;
  valores: { nombre: string; sucursal_id: string } | null;
};

// Se guarda con la sesión del dueño: RLS solo deja editar al personal de su
// cafetería (y no a sí mismo); la llave de la base impide poner una sucursal
// de otra cafetería.
export async function actualizarBarista(
  _anterior: EstadoEditar,
  fd: FormData,
): Promise<EstadoEditar> {
  const id = texto(fd, "id");
  const valores = {
    nombre: texto(fd, "nombre").replace(/\s+/g, " "),
    sucursal_id: texto(fd, "sucursal_id"),
  };
  const fallo = (error: string): EstadoEditar => ({ error, guardado: false, valores });

  const perfil = await perfilDueno();
  if (!perfil) return fallo("No autorizado.");
  if (!ID_REGEX.test(id)) return fallo("Barista no válido.");
  if (valores.nombre.length < 2 || valores.nombre.length > 80) {
    return fallo("El nombre debe tener entre 2 y 80 caracteres.");
  }

  const supabase = await createClient();
  const { data: actual, error: errorActual } = await supabase
    .from("staff")
    .select("sucursal_id")
    .eq("id", id)
    .eq("cafeteria_id", perfil.cafeteriaId)
    .eq("rol", "barista")
    .maybeSingle();
  if (errorActual) return fallo(`No se pudo leer al barista: ${errorActual.message}`);
  if (!actual) return fallo("Barista no encontrado.");

  // Puede dejar la sucursal que ya tenía aunque esté desactivada; una nueva
  // tiene que estar activa
  if (valores.sucursal_id && valores.sucursal_id !== actual.sucursal_id) {
    const activas = await sucursalesActivas(perfil.cafeteriaId);
    if (!activas.includes(valores.sucursal_id)) return fallo("Elige una sucursal de la lista.");
  }

  const { data, error } = await supabase
    .from("staff")
    .update({ nombre: valores.nombre, sucursal_id: valores.sucursal_id || null })
    .eq("id", id)
    .eq("cafeteria_id", perfil.cafeteriaId)
    .eq("rol", "barista")
    .select("id");
  if (error) return fallo(`No se pudo guardar: ${error.message}`);
  if (!data || data.length === 0) return fallo("Barista no encontrado.");

  refresh();
  return { error: null, guardado: true, valores: null };
}

// ---------------------------------------------------------------------
//  Desactivar / reactivar barista
// ---------------------------------------------------------------------

export type EstadoActivarBarista = { error: string | null };

export async function cambiarEstadoBarista(
  _anterior: EstadoActivarBarista,
  fd: FormData,
): Promise<EstadoActivarBarista> {
  const id = texto(fd, "id");
  const activo = fd.get("activo") === "1";

  const perfil = await perfilDueno();
  if (!perfil) return { error: "No autorizado." };
  if (!ID_REGEX.test(id)) return { error: "Barista no válido." };

  const supabase = await createClient();

  // Al reactivarlo, su sucursal tiene que estar activa para que pueda sellar
  if (activo) {
    const { data: actual } = await supabase
      .from("staff")
      .select("sucursal_id, sucursales ( activa )")
      .eq("id", id)
      .eq("cafeteria_id", perfil.cafeteriaId)
      .maybeSingle();
    const sucursal = Array.isArray(actual?.sucursales) ? actual.sucursales[0] : actual?.sucursales;
    if (actual?.sucursal_id && sucursal && !(sucursal as { activa: boolean }).activa) {
      return { error: "Su sucursal está desactivada. Cámbiale la sucursal antes de reactivarlo." };
    }
  }

  const { data, error } = await supabase
    .from("staff")
    .update({ activo })
    .eq("id", id)
    .eq("cafeteria_id", perfil.cafeteriaId)
    .eq("rol", "barista")
    .select("id");
  if (error) return { error: `No se pudo guardar: ${error.message}` };
  if (!data || data.length === 0) return { error: "Barista no encontrado." };

  refresh();
  return { error: null };
}

// ---------------------------------------------------------------------
//  Nuevo link para el barista: de invitación si no ha creado su
//  contraseña, o para cambiarla si ya la tiene (la olvidó)
// ---------------------------------------------------------------------

export type EstadoLinkBarista = {
  error: string | null;
  link: string | null;
  cambio: boolean;
};

export async function nuevoLinkBarista(
  _anterior: EstadoLinkBarista,
  fd: FormData,
): Promise<EstadoLinkBarista> {
  const fallo = (error: string): EstadoLinkBarista => ({ error, link: null, cambio: false });
  const id = texto(fd, "id");

  const perfil = await perfilDueno();
  if (!perfil) return fallo("No autorizado.");
  if (!ID_REGEX.test(id)) return fallo("Barista no válido.");

  // Con la sesión del dueño: solo encuentra al personal de su cafetería
  const supabase = await createClient();
  const { data: staff, error: errorStaff } = await supabase
    .from("staff")
    .select("id, nombre, activo")
    .eq("id", id)
    .eq("cafeteria_id", perfil.cafeteriaId)
    .eq("rol", "barista")
    .maybeSingle();
  if (errorStaff) return fallo(`No se pudo leer al barista: ${errorStaff.message}`);
  if (!staff) return fallo("Barista no encontrado.");
  if (!staff.activo) return fallo("Este barista está desactivado. Reactívalo primero.");

  const admin = createAdminClient();
  const { data: usuario, error: errorUsuario } = await admin.auth.admin.getUserById(id);
  if (errorUsuario || !usuario.user?.email) return fallo("No se encontró la cuenta del barista.");
  const cambio = tieneContrasena(usuario.user);
  const resultado = cambio
    ? await generarLinkCambioContrasena(usuario.user.email)
    : await generarLinkInvitacion(usuario.user.email, staff.nombre as string, {
        permitirExistente: true,
      });
  if (!resultado.ok) return fallo(resultado.error);
  return { error: null, link: resultado.link, cambio };
}
