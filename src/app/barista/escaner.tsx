"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import {
  Camera,
  CheckCircle2,
  Gift,
  Keyboard,
  LoaderCircle,
  ScanLine,
  Stamp,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  buscarTarjeta,
  canjearPremio,
  sellarTarjeta,
  type ResultadoBarista,
  type TarjetaBarista,
} from "@/lib/actions/barista";

// Los tipos de código que puede llevar una tarjeta
const FORMATOS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.AZTEC,
  BarcodeFormat.PDF_417,
  BarcodeFormat.CODE_128,
];

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

export function Escaner() {
  const [escaneando, setEscaneando] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [tarjeta, setTarjeta] = useState<TarjetaBarista | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [pendiente, iniciar] = useTransition();
  const video = useRef<HTMLVideoElement>(null);

  function procesar(resultado: ResultadoBarista) {
    if (resultado.ok) {
      setTarjeta(resultado.tarjeta);
      setAviso(resultado.mensaje ? { tipo: "ok", texto: resultado.mensaje } : null);
      if (resultado.mensaje) navigator.vibrate?.(120);
    } else {
      setAviso({ tipo: "error", texto: resultado.error });
      navigator.vibrate?.([60, 60, 60]);
    }
  }

  function buscar(texto: string) {
    setAviso(null);
    iniciar(async () => procesar(await buscarTarjeta(texto)));
  }

  // Cámara: arranca al escanear y se apaga al leer un código o al cancelar
  useEffect(() => {
    if (!escaneando || !video.current) return;

    let controles: IScannerControls | null = null;
    let cancelado = false;
    const lector = new BrowserMultiFormatReader(
      new Map<DecodeHintType, unknown>([
        [DecodeHintType.POSSIBLE_FORMATS, FORMATOS],
        [DecodeHintType.TRY_HARDER, true],
      ]),
    );

    lector
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        video.current,
        (resultado, _error, c) => {
          if (resultado && !cancelado) {
            cancelado = true;
            c.stop();
            setEscaneando(false);
            buscar(resultado.getText());
          }
        },
      )
      .then((c) => {
        controles = c;
        if (cancelado) c.stop();
      })
      .catch((e: unknown) => {
        const nombre = e instanceof Error ? e.name : "";
        setErrorCamara(
          nombre === "NotAllowedError"
            ? "Permite el acceso a la cámara en tu navegador para escanear."
            : nombre === "NotFoundError" || nombre === "OverconstrainedError"
              ? "No encontramos una cámara en este dispositivo."
              : "No se pudo abrir la cámara. Escribe el código a mano.",
        );
        setEscaneando(false);
      });

    return () => {
      cancelado = true;
      controles?.stop();
    };
    // buscar no cambia entre renders de forma relevante para la cámara
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escaneando]);

  function abrirCamara() {
    setErrorCamara(null);
    setAviso(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorCamara("La cámara solo funciona en una conexión segura (HTTPS). Escribe el código a mano.");
      return;
    }
    setEscaneando(true);
  }

  function siguiente() {
    setTarjeta(null);
    setManual("");
    abrirCamara();
  }

  const completa = tarjeta ? tarjeta.sellos >= tarjeta.requeridos : false;

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      {aviso && (
        <div
          role={aviso.tipo === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-xl p-4 text-sm font-medium ring-1 ${
            aviso.tipo === "ok"
              ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
              : "bg-red-50 text-red-800 ring-red-200"
          }`}
        >
          {aviso.tipo === "ok" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <span>{aviso.texto}</span>
        </div>
      )}

      {tarjeta ? (
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <div>
            <p className="text-sm text-stone-500">Cliente</p>
            <p className="text-2xl font-semibold text-stone-900">{tarjeta.cliente}</p>
            <p className="text-sm text-stone-500">
              {tarjeta.programa} · Premio: {tarjeta.premio}
            </p>
          </div>

          <div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-amber-900" data-testid="sellos">
                {tarjeta.sellos} / {tarjeta.requeridos}
              </p>
              <p className="text-sm text-stone-500">
                {completa
                  ? "¡Tarjeta completa!"
                  : `Faltan ${tarjeta.requeridos - tarjeta.sellos}`}
              </p>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-amber-800 transition-all"
                style={{ width: `${Math.min(100, (tarjeta.sellos / tarjeta.requeridos) * 100)}%` }}
              />
            </div>
            {tarjeta.premiosCanjeados > 0 && (
              <p className="mt-1 text-xs text-stone-400">
                Premios canjeados: {tarjeta.premiosCanjeados}
              </p>
            )}
          </div>

          {!tarjeta.programaActivo && (
            <p className="rounded-lg bg-stone-50 p-2 text-xs text-stone-600 ring-1 ring-stone-200">
              Este programa está pausado: no se pueden dar sellos.
            </p>
          )}

          <div className="grid gap-2">
            {completa ? (
              <button
                type="button"
                disabled={pendiente}
                onClick={() =>
                  iniciar(async () => procesar(await canjearPremio(tarjeta.codigo)))
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-lg font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {pendiente ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
                Canjear premio
              </button>
            ) : (
              <button
                type="button"
                disabled={pendiente || !tarjeta.programaActivo}
                onClick={() =>
                  iniciar(async () => procesar(await sellarTarjeta(tarjeta.codigo)))
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-4 text-lg font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
              >
                {pendiente ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Stamp className="h-5 w-5" />}
                Sellar
              </button>
            )}
            <button
              type="button"
              onClick={siguiente}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100"
            >
              <ScanLine className="h-5 w-5" />
              Escanear otra tarjeta
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl bg-stone-900 shadow-sm">
            {escaneando ? (
              <div className="relative">
                <video ref={video} className="aspect-square w-full object-cover" muted playsInline />
                <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
                <button
                  type="button"
                  onClick={() => setEscaneando(false)}
                  aria-label="Cerrar cámara"
                  className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
                <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white/90">
                  Apunta al código de la tarjeta
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={abrirCamara}
                disabled={pendiente}
                className="flex aspect-square w-full flex-col items-center justify-center gap-3 text-white transition hover:bg-stone-800 disabled:opacity-60"
              >
                {pendiente ? (
                  <LoaderCircle className="h-12 w-12 animate-spin" />
                ) : (
                  <Camera className="h-12 w-12" />
                )}
                <span className="text-lg font-semibold">
                  {pendiente ? "Buscando tarjeta..." : "Escanear tarjeta"}
                </span>
              </button>
            )}
          </div>

          {errorCamara && (
            <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
              {errorCamara}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) buscar(manual);
            }}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"
          >
            <label htmlFor="codigo-manual" className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <Keyboard className="h-4 w-4" />
              O escribe el código
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="codigo-manual"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="1717 1a82 c2b0 ..."
                className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
              />
              <button
                type="submit"
                disabled={pendiente || !manual.trim()}
                className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
              >
                Buscar
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
