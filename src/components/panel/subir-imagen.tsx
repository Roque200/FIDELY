"use client";

import { useRef, useState } from "react";
import { ImageUp, LoaderCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nombre: string;
  etiqueta: string;
  ayuda: string;
  url: string;
  onCambio: (url: string) => void;
  // Carpeta dentro del bucket: "<cafeteria_id>/<programa_id>"
  carpeta: string;
  minAncho: number;
  minAlto: number;
  cuadrada?: boolean;
};

const MAX_BYTES = 1024 * 1024;
const TIPOS = ["image/png", "image/jpeg"];

function medir(archivo: File) {
  return new Promise<{ ancho: number; alto: number }>((resolve, reject) => {
    const img = new Image();
    const objeto = URL.createObjectURL(archivo);
    img.onload = () => {
      resolve({ ancho: img.naturalWidth, alto: img.naturalHeight });
      URL.revokeObjectURL(objeto);
    };
    img.onerror = () => {
      reject(new Error("No se pudo leer la imagen."));
      URL.revokeObjectURL(objeto);
    };
    img.src = objeto;
  });
}

// Sube una imagen a Supabase Storage (carpeta de la cafetería) y guarda su URL
export function SubirImagen({
  nombre,
  etiqueta,
  ayuda,
  url,
  onCambio,
  carpeta,
  minAncho,
  minAlto,
  cuadrada = false,
}: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alElegir(archivo: File | undefined) {
    setError(null);
    if (!archivo) return;

    if (!TIPOS.includes(archivo.type)) {
      setError("Usa una imagen PNG o JPG.");
      return;
    }
    if (archivo.size > MAX_BYTES) {
      setError("La imagen pesa más de 1 MB. Redúcela e intenta de nuevo.");
      return;
    }

    try {
      const { ancho, alto } = await medir(archivo);
      if (ancho < minAncho || alto < minAlto) {
        setError(`La imagen mide ${ancho}×${alto} px; debe ser de al menos ${minAncho}×${minAlto} px.`);
        return;
      }
      if (cuadrada && Math.abs(ancho / alto - 1) > 0.1) {
        setError(`La imagen debe ser cuadrada (mide ${ancho}×${alto} px).`);
        return;
      }

      setSubiendo(true);
      const extension = archivo.type === "image/png" ? "png" : "jpg";
      const ruta = `${carpeta}/${nombre}-${Date.now()}.${extension}`;
      const supabase = createClient();
      const { error: errorSubida } = await supabase.storage
        .from("disenos")
        .upload(ruta, archivo, { contentType: archivo.type, upsert: false });

      if (errorSubida) {
        setError(`No se pudo subir la imagen: ${errorSubida.message}`);
        return;
      }

      const { data } = supabase.storage.from("disenos").getPublicUrl(ruta);
      onCambio(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={nombre} value={url} />
      <div className="flex items-stretch overflow-hidden rounded-xl ring-1 ring-stone-200">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={subiendo}
          aria-label={`Subir ${etiqueta}`}
          className="flex w-20 shrink-0 items-center justify-center bg-amber-900 text-white transition hover:bg-amber-800 disabled:opacity-60"
        >
          {subiendo ? (
            <LoaderCircle className="h-6 w-6 animate-spin" />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full max-h-20 w-full bg-white object-contain p-1.5" />
          ) : (
            <ImageUp className="h-6 w-6" />
          )}
        </button>
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <p className="text-sm font-medium text-stone-900">{etiqueta}</p>
          <p className="text-xs text-stone-500">{ayuda}</p>
          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={() => entrada.current?.click()}
              disabled={subiendo}
              className="text-xs font-medium text-amber-900 hover:underline disabled:opacity-60"
            >
              {subiendo ? "Subiendo..." : url ? "Cambiar" : "Subir imagen"}
            </button>
            {url && !subiendo && (
              <button
                type="button"
                onClick={() => onCambio("")}
                className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => alElegir(e.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
