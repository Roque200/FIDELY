import QRCode from "qrcode";
import { Coffee } from "lucide-react";

export type DisenoCafeteria = {
  nombre: string;
  logo_url: string | null;
  color_fondo: string;
  color_texto: string;
  color_etiquetas: string;
};

export type DatosPrograma = {
  nombre: string;
  premio: string;
  sellos_requeridos: number;
};

type Props = {
  cafeteria: DisenoCafeteria;
  programa: DatosPrograma;
  // Lo que va dentro del QR (en la tarjeta real es tarjetas.codigo)
  valorQr: string;
  // Sellos que se pintan como ejemplo en la vista previa
  sellosMuestra?: number;
};

// Vista previa de cómo se ve la tarjeta en Apple / Google Wallet
export async function TarjetaWallet({
  cafeteria,
  programa,
  valorQr,
  sellosMuestra,
}: Props) {
  const qr = await QRCode.toString(valorQr, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
  });

  const total = programa.sellos_requeridos;
  const llenos = Math.min(sellosMuestra ?? Math.floor(total / 3), total);

  const etiqueta = { color: cafeteria.color_etiquetas };

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-2xl shadow-md"
      style={{
        backgroundColor: cafeteria.color_fondo,
        color: cafeteria.color_texto,
      }}
    >
      {/* Logo / nombre y premio */}
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        {cafeteria.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cafeteria.logo_url}
            alt={cafeteria.nombre}
            className="h-8 max-w-[55%] object-contain object-left"
          />
        ) : (
          <span className="truncate text-lg font-semibold leading-8">
            {cafeteria.nombre}
          </span>
        )}
        <div className="min-w-0 text-right">
          <p className="text-[11px] font-semibold" style={etiqueta}>
            Premio
          </p>
          <p className="truncate text-sm leading-tight">{programa.premio}</p>
        </div>
      </div>

      {/* Sellos */}
      <div className="bg-black/10 px-4 py-5">
        {total <= 10 ? (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: total }, (_, i) => {
              const lleno = i < llenos;
              return (
                <span
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: cafeteria.color_texto,
                    backgroundColor: lleno ? cafeteria.color_texto : "transparent",
                    opacity: lleno ? 1 : 0.45,
                  }}
                >
                  {lleno && (
                    <Coffee
                      className="h-1/2 w-1/2"
                      style={{ color: cafeteria.color_fondo }}
                    />
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          <div>
            <p className="text-2xl font-semibold">
              {llenos} / {total}
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: `${cafeteria.color_texto}40` }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(llenos / total) * 100}%`,
                  backgroundColor: cafeteria.color_texto,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Datos del programa */}
      <div className="flex items-end justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold" style={etiqueta}>
            Programa
          </p>
          <p className="truncate leading-tight">{programa.nombre}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold" style={etiqueta}>
            Meta
          </p>
          <p className="leading-tight">{total} sellos</p>
        </div>
      </div>

      {/* QR */}
      <div className="flex justify-center px-4 pb-5 pt-4">
        <div
          className="h-28 w-28 rounded-xl bg-white p-2.5 [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      </div>
    </div>
  );
}
