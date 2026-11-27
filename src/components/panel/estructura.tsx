"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumn,
  CreditCard,
  Menu,
  ScanLine,
  Settings,
  Store,
  UserCog,
  Users,
  MapPin,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./logo";

const ICONOS = {
  tarjetas: CreditCard,
  clientes: Users,
  informes: ChartColumn,
  sucursales: MapPin,
  usuarios: UserCog,
  configuracion: Settings,
  escaner: ScanLine,
  cafeterias: Store,
} satisfies Record<string, LucideIcon>;

export type NombreIcono = keyof typeof ICONOS;

export type ItemMenu = {
  etiqueta: string;
  icono: NombreIcono;
  // Sin href = sección que todavía no existe (se muestra con "Pronto")
  href?: string;
  // Rutas que también marcan la opción como activa. Si se da, href solo
  // cuenta exacto (para que "/panel" no se marque en todo el panel).
  rutas?: string[];
};

const coincide = (ruta: string, base: string) =>
  ruta === base || ruta.startsWith(`${base}/`);

type Props = {
  items: ItemMenu[];
  usuario: React.ReactNode;
  children: React.ReactNode;
};

// Estructura de escritorio: menú lateral + barra superior + contenido.
// En celular el menú se abre como cajón con el botón de hamburguesa.
export function Estructura({ items, usuario, children }: Props) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  const menu = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icono = ICONOS[item.icono];

        if (!item.href) {
          return (
            <div
              key={item.etiqueta}
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-stone-400"
              title="Esta sección viene pronto"
            >
              <Icono className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.etiqueta}</span>
              <span className="rounded-full bg-stone-200/70 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                Pronto
              </span>
            </div>
          );
        }

        const activo = item.rutas
          ? pathname === item.href || item.rutas.some((r) => coincide(pathname, r))
          : coincide(pathname, item.href);

        return (
          <Link
            key={item.etiqueta}
            href={item.href}
            onClick={() => setAbierto(false)}
            className={
              activo
                ? "flex items-center gap-3 rounded-xl bg-amber-900/10 px-3 py-2.5 font-medium text-amber-950"
                : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-stone-600 transition hover:bg-stone-200/60 hover:text-stone-900"
            }
          >
            <Icono
              className={`h-5 w-5 shrink-0 ${activo ? "text-amber-900" : ""}`}
            />
            <span>{item.etiqueta}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-1 bg-stone-100">
      {/* Menú lateral fijo (escritorio) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 px-4 py-5 md:flex">
        <Logo />
        {menu}
      </aside>

      {/* Cajón (celular) */}
      {abierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-stone-900/40"
            onClick={() => setAbierto(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col gap-6 bg-stone-100 px-4 py-5 shadow-xl">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                aria-label="Cerrar menú"
                className="rounded-lg p-2 text-stone-600 hover:bg-stone-200"
                onClick={() => setAbierto(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {menu}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 px-4 md:justify-end md:px-6">
          <button
            type="button"
            aria-label="Abrir menú"
            className="rounded-lg p-2 text-stone-700 hover:bg-stone-200 md:hidden"
            onClick={() => setAbierto(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="ml-auto md:ml-0">{usuario}</div>
        </header>

        <main className="flex flex-1 flex-col px-2 pb-2 sm:px-4 sm:pb-4 md:px-6 md:pb-6">
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
