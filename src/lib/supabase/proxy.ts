import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que requieren sesión iniciada
const RUTAS_PROTEGIDAS = ["/panel", "/barista", "/admin", "/bienvenida"];

function esRutaProtegida(pathname: string) {
  return RUTAS_PROTEGIDAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
}

// Refresca la sesión de Supabase Auth en cada request,
// pasa las cookies actualizadas al request y a la respuesta,
// y manda al login a quien entra a una ruta protegida sin sesión.
// El rol (dueño, barista, admin) se revisa en el layout de cada sección.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // No poner código entre createServerClient y getClaims():
  // getClaims() valida el token y lo refresca si ya venció.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && esRutaProtegida(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";

    const redireccion = NextResponse.redirect(url);
    // Conservar las cookies que Supabase haya actualizado
    response.cookies.getAll().forEach((cookie) =>
      redireccion.cookies.set(cookie),
    );
    return redireccion;
  }

  return response;
}
