import { requireRol } from "@/lib/auth";

export default async function PanelPage() {
  const perfil = await requireRol("dueno");

  return (
    <h1 className="text-xl font-semibold text-stone-900">
      Hola, {perfil.nombre}
    </h1>
  );
}
