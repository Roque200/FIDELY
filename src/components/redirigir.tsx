"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PantallaCarga } from "@/components/pantalla-carga";

// Manda al usuario a otra ruta desde el navegador
// (cuando entra a una sección que no le corresponde)
export function Redirigir({ a }: { a: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(a);
  }, [a, router]);

  return <PantallaCarga />;
}
