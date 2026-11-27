"use server";

import { refresh } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generarLinkInvitacion, tieneContrasena } from "@/lib/invitaciones";
import { SLUG_REGEX } from "@/lib/slug";
import { esZonaValida } from "@/lib/zonas-horarias";

const ESTADOS = ["prueba", "activa", "vencida", "cancelada"] as const;
type Estado = (typeof ESTADOS)[number];

const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(fd: FormData, campo: string) {
  return String(fd.get(campo) ?? "").trim();
}

function enteroValido(valor: string, min: number, max: number) {
  if (!/^\d+$/.test(valor)) return null;
  const n = Number(valor);
  return n >= min && n <= max ? n : null;
}

async function esAdmin() {
  const perfil = await getPerfil();
  return perfil?.tipo === "admin";
}

// ---------------------------------------------------------------------
//  Alta de cafetería + invitación al dueño
// ---------------------------------------------------------------------

export type ValoresAlta = {
  nombre: string;
  slug: string;
  zona_horaria: string;
  plan: string;
  estado_suscripcion: string;
  max_programas: string;
  dueno_nombre: string;
  dueno_correo: string;
};

export type EstadoAlta = {
  error: string | null;
  valores: ValoresAlta;
  resultado: {
    cafeteriaId: string;
    cafeteria: string;
    dueno: string;
    correo: string;
    link: string;
  } | null;
};

export async function crearCafeteria(
  _anterior: EstadoAlta,
  fd: FormData,
): Promise<EstadoAlta> {
  const valores: ValoresAlta = {
    nombre: texto(fd, "nombre"),
    slug: texto(fd, "slug").toLowerCase(),
    zona_horaria: texto(fd, "zona_horaria"),
    plan: texto(fd, "plan").toLowerCase(),
    estado_suscripcion: texto(fd, "estado_suscripcion"),
    max_programas: texto(fd, "max_programas"),
    dueno_nombre: texto(fd, "dueno_nombre"),
    dueno_correo: texto(fd, "dueno_correo").toLowerCase(),
  };
  const fallo = (error: string): EstadoAlta => ({ error, valores, resultado: null });

  if (!(await esAdmin())) return fallo("No autorizado.");

  // Validaciones
  if (valores.nombre.length < 2 || valores.nombre.length > 80) {
    return fallo("El nombre de la cafetería debe tener entre 2 y 80 caracteres.");
  }
  if (!SLUG_REGEX.test(valores.slug) || valores.slug.length < 3 || valores.slug.length > 40) {
    return fallo(
      "El slug debe tener de 3 a 40 caracteres: solo minúsculas, números y guiones (ej. cafe-la-esquina).",
    );
  }
  if (!esZonaValida(valores.zona_horaria)) {
    return fallo("Elige una zona horaria de la lista.");
  }
  if (!/^[a-z0-9-]{2,30}$/.test(valores.plan)) {
    return fallo("El plan debe ser una palabra corta (ej. basico, pro).");
  }
  if (!ESTADOS.includes(valores.estado_suscripcion as Estado)) {
    return fallo("Elige un estado de suscripción válido.");
  }
  const maxProgramas = enteroValido(valores.max_programas, 1, 50);
  if (maxProgramas === null) {
    return fallo("Los programas máximos deben ser un número entre 1 y 50.");
  }
  if (valores.dueno_nombre.length < 2 || valores.dueno_nombre.length > 80) {
    return fallo("El nombre del dueño debe tener entre 2 y 80 caracteres.");
  }
  if (!CORREO_REGEX.test(valores.dueno_correo)) {
    return fallo("El correo del dueño no es válido.");
  }

  const admin = createAdminClient();

  // 0) Revisar el correo antes de tocar nada: si ya es de alguien del
  //    personal o del admin, no se le genera link (invalidaría el suyo).
  const { data: usuarioExistente, error: errorBusqueda } = await admin.rpc(
    "usuario_id_por_correo",
    { p_correo: valores.dueno_correo },
  );
  if (errorBusqueda) {
    return fallo(`No se pudo revisar el correo: ${errorBusqueda.message}`);
  }
  if (usuarioExistente) {
    const [{ data: esStaff }, { data: esSuperAdmin }] = await Promise.all([
      admin.from("staff").select("id").eq("id", usuarioExistente).maybeSingle(),
      admin.from("super_admins").select("user_id").eq("user_id", usuarioExistente).maybeSingle(),
    ]);
    if (esStaff) {
      return fallo("Ese correo ya pertenece al personal de otra cafetería.");
    }
    if (esSuperAdmin) {
      return fallo("Ese correo ya tiene una cuenta activa. Usa otro correo.");
    }
  }

  // 1) Cafetería
  const { data: cafeteria, error: errorCafeteria } = await admin
    .from("cafeterias")
    .insert({
      nombre: valores.nombre,
      slug: valores.slug,
      zona_horaria: valores.zona_horaria,
      plan: valores.plan,
      estado_suscripcion: valores.estado_suscripcion,
      max_programas: maxProgramas,
    })
    .select("id")
    .single();

  if (errorCafeteria) {
    if (errorCafeteria.code === "23505") {
      return fallo(`El slug "${valores.slug}" ya lo usa otra cafetería.`);
    }
    return fallo(`No se pudo crear la cafetería: ${errorCafeteria.message}`);
  }

  // 2) Usuario del dueño + link de invitación
  const invitacion = await generarLinkInvitacion(
    valores.dueno_correo,
    valores.dueno_nombre,
  );
  if (!invitacion.ok) {
    await admin.from("cafeterias").delete().eq("id", cafeteria.id);
    return fallo(invitacion.error);
  }

  // Si ese correo ya es staff de otra cafetería (invitación pendiente),
  // no se toca a ese usuario: solo se deshace la cafetería nueva.
  const { data: staffExistente } = await admin
    .from("staff")
    .select("id")
    .eq("id", invitacion.userId)
    .maybeSingle();
  if (staffExistente) {
    await admin.from("cafeterias").delete().eq("id", cafeteria.id);
    return fallo("Ese correo ya pertenece al personal de otra cafetería.");
  }

  // 3) Registro de staff como dueño
  const { error: errorStaff } = await admin.from("staff").insert({
    id: invitacion.userId,
    cafeteria_id: cafeteria.id,
    nombre: valores.dueno_nombre,
    rol: "dueno",
  });

  if (errorStaff) {
    // Deshacer para no dejar registros a medias
    await admin.auth.admin.deleteUser(invitacion.userId);
    await admin.from("cafeterias").delete().eq("id", cafeteria.id);
    return fallo(`No se pudo registrar al dueño: ${errorStaff.message}`);
  }

  return {
    error: null,
    valores,
    resultado: {
      cafeteriaId: cafeteria.id,
      cafeteria: valores.nombre,
      dueno: valores.dueno_nombre,
      correo: valores.dueno_correo,
      link: invitacion.link,
    },
  };
}

// ---------------------------------------------------------------------
//  Editar plan, estado, zona y límite de programas
// ---------------------------------------------------------------------

export type EstadoEdicion = {
  error: string | null;
  guardado: boolean;
};

export async function actualizarCafeteria(
  _anterior: EstadoEdicion,
  fd: FormData,
): Promise<EstadoEdicion> {
  const fallo = (error: string): EstadoEdicion => ({ error, guardado: false });

  if (!(await esAdmin())) return fallo("No autorizado.");

  const id = texto(fd, "id");
  const nombre = texto(fd, "nombre");
  const zona = texto(fd, "zona_horaria");
  const plan = texto(fd, "plan").toLowerCase();
  const estado = texto(fd, "estado_suscripcion");
  const maxProgramas = enteroValido(texto(fd, "max_programas"), 1, 50);

  if (!/^[0-9a-f-]{36}$/.test(id)) return fallo("Cafetería no válida.");
  if (nombre.length < 2 || nombre.length > 80) {
    return fallo("El nombre debe tener entre 2 y 80 caracteres.");
  }
  if (!esZonaValida(zona)) return fallo("Elige una zona horaria de la lista.");
  if (!/^[a-z0-9-]{2,30}$/.test(plan)) {
    return fallo("El plan debe ser una palabra corta (ej. basico, pro).");
  }
  if (!ESTADOS.includes(estado as Estado)) {
    return fallo("Elige un estado de suscripción válido.");
  }
  if (maxProgramas === null) {
    return fallo("Los programas máximos deben ser un número entre 1 y 50.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cafeterias")
    .update({
      nombre,
      zona_horaria: zona,
      plan,
      estado_suscripcion: estado,
      max_programas: maxProgramas,
    })
    .eq("id", id)
    .select("id");

  if (error) return fallo(`No se pudo guardar: ${error.message}`);
  if (!data || data.length === 0) return fallo("La cafetería ya no existe.");

  // Que la página muestre los datos nuevos (título, contador de programas)
  refresh();
  return { error: null, guardado: true };
}

// ---------------------------------------------------------------------
//  Nuevo link de invitación para un dueño que no la ha aceptado
// ---------------------------------------------------------------------

export type EstadoLink = {
  error: string | null;
  link: string | null;
};

export async function nuevoLinkDueno(
  _anterior: EstadoLink,
  fd: FormData,
): Promise<EstadoLink> {
  const fallo = (error: string): EstadoLink => ({ error, link: null });

  if (!(await esAdmin())) return fallo("No autorizado.");

  const staffId = texto(fd, "staff_id");
  if (!/^[0-9a-f-]{36}$/.test(staffId)) return fallo("Dueño no válido.");

  const admin = createAdminClient();

  const { data: staff, error: errorStaff } = await admin
    .from("staff")
    .select("id, nombre, rol")
    .eq("id", staffId)
    .maybeSingle();
  if (errorStaff) return fallo(`No se pudo leer al dueño: ${errorStaff.message}`);
  if (!staff || staff.rol !== "dueno") return fallo("Dueño no encontrado.");

  const { data: usuario, error: errorUsuario } =
    await admin.auth.admin.getUserById(staffId);
  if (errorUsuario || !usuario.user?.email) {
    return fallo("No se encontró la cuenta del dueño.");
  }

  // Solo si todavía no crea su contraseña: si ya la tiene, que entre con ella
  if (tieneContrasena(usuario.user)) {
    return fallo("Este dueño ya creó su contraseña; que entre con ella.");
  }

  const invitacion = await generarLinkInvitacion(
    usuario.user.email,
    staff.nombre as string,
    { permitirExistente: true },
  );
  if (!invitacion.ok) return fallo(invitacion.error);

  return { error: null, link: invitacion.link };
}
