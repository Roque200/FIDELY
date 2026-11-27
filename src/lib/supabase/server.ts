import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Cliente para Server Components, Server Actions y Route Handlers.
// Usa la sesión del usuario logueado (cookies) y respeta RLS.
// Crear uno nuevo en cada request, nunca reutilizarlo.
export async function createClient() {
  // Todo lo que use la sesión se hace en cada request, nunca en el prerender:
  // el cliente de Supabase usa Date.now() para revisar si el token venció.
  await connection();

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // En Server Components no se pueden escribir cookies.
            // No pasa nada: el proxy se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}
