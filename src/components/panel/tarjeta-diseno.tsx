import { ICONOS_SELLO, type DisenoTarjeta } from "@/lib/diseno";

type Props = {
  diseno: DisenoTarjeta;
  programa: {
    nombre: string;
    premio: string;
    sellos_requeridos: number;
  };
  // SVG del código ya generado (QR, Aztec, PDF417 o Code 128)
  codigo: string;
  // Apple usa el logo horizontal; Google, el cuadrado con el nombre
  variante?: "apple" | "google";
  // Sellos que se pintan como ejemplo en la vista previa
  sellosMuestra?: number;
};

// Dibujo de la tarjeta como se ve en la cartera del cliente.
// No usa nada del servidor: sirve también para la vista previa en vivo.
export function TarjetaDiseno({
  diseno,
  programa,
  codigo,
  variante = "apple",
  sellosMuestra,
}: Props) {
  // Mientras escriben en el formulario puede venir vacío o fuera de rango
  const total = Math.min(50, Math.max(1, Math.floor(programa.sellos_requeridos) || 1));
  const llenos = Math.min(sellosMuestra ?? Math.floor(total / 3), total);
  const etiqueta = { color: diseno.colorEtiquetas };
  const codigoAncho = diseno.tipoCodigo === "pdf417" || diseno.tipoCodigo === "code128";

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-2xl shadow-md"
      style={{ backgroundColor: diseno.colorFondo, color: diseno.colorTexto }}
    >
      {/* Logo / nombre y premio */}
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        {variante === "google" ? (
          <div className="flex min-w-0 items-center gap-2">
            {diseno.logoCuadrado ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={diseno.logoCuadrado}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full bg-white object-cover"
              />
            ) : (
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{ backgroundColor: diseno.colorTexto, color: diseno.colorFondo }}
              >
                {diseno.nombreCafeteria.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate font-semibold">{diseno.nombreCafeteria}</span>
          </div>
        ) : diseno.logoHorizontal ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={diseno.logoHorizontal}
            alt={diseno.nombreCafeteria}
            className="h-8 max-w-[55%] object-contain object-left"
          />
        ) : (
          <span className="truncate text-lg font-semibold leading-8">
            {diseno.nombreCafeteria}
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
      <div className="px-4 py-5" style={{ backgroundColor: diseno.colorFondoSello }}>
        {total <= 10 ? (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: total }, (_, i) => (
              <Sello key={i} diseno={diseno} lleno={i < llenos} />
            ))}
          </div>
        ) : (
          <div>
            <p className="text-2xl font-semibold">
              {llenos} / {total}
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: diseno.colorSelloInactivo }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(llenos / total) * 100}%`,
                  backgroundColor: diseno.colorSelloActivo,
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

      {/* Código */}
      <div className="flex justify-center px-4 pb-5 pt-4">
        <div
          className={`rounded-xl bg-white p-2.5 [&_svg]:h-full [&_svg]:w-full ${
            codigoAncho ? "h-20 w-full max-w-[230px]" : "h-28 w-28"
          }`}
          dangerouslySetInnerHTML={{ __html: codigo }}
        />
      </div>
    </div>
  );
}

function Sello({ diseno, lleno }: { diseno: DisenoTarjeta; lleno: boolean }) {
  const url = lleno ? diseno.iconoSelloUrl : diseno.iconoSelloInactivoUrl;
  const clave = lleno ? diseno.iconoSello : diseno.iconoSelloInactivo;
  const { Icono } = ICONOS_SELLO[clave];
  const color = lleno ? diseno.colorSelloActivo : diseno.colorSelloInactivo;

  return (
    <span
      className="flex aspect-square items-center justify-center rounded-full border-2"
      style={{
        borderColor: color,
        backgroundColor: lleno ? color : "transparent",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-3/5 w-3/5 object-contain" />
      ) : (
        <Icono
          className="h-1/2 w-1/2"
          style={{ color: lleno ? diseno.colorFondoSello : color }}
        />
      )}
    </span>
  );
}
