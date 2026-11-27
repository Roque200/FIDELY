import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { verificarAcceso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Escaner } from "./escaner";

// Depende de la sesión y el layout puede no pintarla (si no tiene acceso),
// así que no se valida como navegación instantánea.
export const instant = false;

export default function BaristaPage() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido />
    </Suspense>
  );
}

// Lee la sesión (por eso va dentro de Suspense).
// Si no tiene acceso no muestra nada: el layout lo redirige.
async function Contenido() {
  const acceso = await verificarAcceso("barista", "dueno");
  if (!acceso.permitido) return null;

  const { perfil } = acceso;

  // Sucursal asignada (si tiene): los sellos se registran ahí
  let sucursal: string | null = null;
  if (perfil.sucursalId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("sucursales")
      .select("nombre")
      .eq("id", perfil.sucursalId)
      .maybeSingle();
    sucursal = (data?.nombre as string | undefined) ?? null;
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto flex w-full max-w-md flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Hola, {perfil.nombre}</h1>
          {sucursal && (
            <p className="flex items-center gap-1 text-sm text-stone-500">
              <MapPin className="h-3.5 w-3.5" />
              {sucursal}
            </p>
          )}
        </div>
        {perfil.tipo === "dueno" && (
          <Link
            href="/panel"
            className="flex items-center gap-1 text-sm font-medium text-amber-900 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </Link>
        )}
      </div>
      <Escaner />
    </div>
  );
}
