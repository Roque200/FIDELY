import { requireRol } from "@/lib/auth";

export default async function AdminPage() {
  await requireRol("admin");

  return (
    <h1 className="text-xl font-semibold text-stone-900">Cafeterías</h1>
  );
}
