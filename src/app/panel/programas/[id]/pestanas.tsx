import Link from "next/link";

type Props = {
  // Sin id = programa nuevo (Diseño se habilita al guardarlo)
  programaId?: string;
  activa: "informacion" | "diseno";
};

// Pestañas Información / Diseño del programa
export function Pestanas({ programaId, activa }: Props) {
  const pestanas = [
    {
      clave: "informacion",
      texto: "Información",
      href: programaId ? `/panel/programas/${programaId}` : "/panel/programas/nuevo",
    },
    {
      clave: "diseno",
      texto: "Diseño",
      href: programaId ? `/panel/programas/${programaId}/diseno` : null,
    },
  ] as const;

  return (
    <nav className="flex gap-1 border-b border-stone-200 px-4 md:px-6" aria-label="Secciones del programa">
      {pestanas.map((p) => {
        const actual = p.clave === activa;
        const clases = `-mb-px border-b-2 px-3 py-3 text-sm font-medium transition ${
          actual
            ? "border-amber-900 text-amber-950"
            : "border-transparent text-stone-500 hover:text-stone-800"
        }`;

        if (!p.href) {
          return (
            <span
              key={p.clave}
              title="Guarda primero la información del programa"
              className="-mb-px cursor-not-allowed border-b-2 border-transparent px-3 py-3 text-sm font-medium text-stone-300"
            >
              {p.texto}
            </span>
          );
        }

        return (
          <Link key={p.clave} href={p.href} className={clases} aria-current={actual ? "page" : undefined}>
            {p.texto}
          </Link>
        );
      })}
    </nav>
  );
}
