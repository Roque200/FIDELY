import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente admin con la service_role / secret key: SE SALTA RLS.
// Solo para el backend: registro público de clientes, firma de tarjetas,
// web service de Apple y altas de staff.
// "server-only" hace que el build falle si alguien lo importa en el navegador.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
