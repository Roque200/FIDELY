import type { MetadataRoute } from "next";

// Permite instalar Fidely en el celular como app (abre directo en el escáner)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fidely",
    short_name: "Fidely",
    description: "Escáner de tarjetas de lealtad: sella y canjea premios.",
    start_url: "/barista",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F5F4",
    theme_color: "#78350F",
    lang: "es-MX",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icono-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
