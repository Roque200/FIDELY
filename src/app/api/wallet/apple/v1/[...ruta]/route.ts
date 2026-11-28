import type { NextRequest } from "next/server";
import {
  paseFirmado,
  quitarRegistro,
  registrarDispositivo,
  tarjetaAutorizada,
  tarjetasActualizadas,
} from "@/lib/apple-wallet";
import { origenActual } from "@/lib/origen";

// Web service de Apple Wallet (lo llama el iPhone, no las personas):
//   POST   /v1/devices/<dispositivo>/registrations/<passTypeId>/<serial>   registrar
//   DELETE /v1/devices/<dispositivo>/registrations/<passTypeId>/<serial>   quitar
//   GET    /v1/devices/<dispositivo>/registrations/<passTypeId>            qué cambió
//   GET    /v1/passes/<passTypeId>/<serial>                                 pase nuevo
//   POST   /v1/log                                                         errores del iPhone
// https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes

type Contexto = { params: Promise<{ ruta: string[] }> };

const vacio = (status: number) => new Response(null, { status });
const valido = (v: string | undefined) => !!v && v.length <= 128 && /^[A-Za-z0-9._-]+$/.test(v);

function error(e: unknown) {
  console.error("Error en el web service de Apple Wallet:", e);
  return vacio(500);
}

export async function POST(request: NextRequest, { params }: Contexto) {
  const ruta = (await params).ruta;

  // Mensajes de error que manda el iPhone (sirven para depurar)
  if (ruta.length === 1 && ruta[0] === "log") {
    try {
      const { logs } = (await request.json()) as { logs?: unknown };
      if (Array.isArray(logs)) {
        for (const l of logs.slice(0, 20)) console.warn("Apple Wallet (iPhone):", String(l).slice(0, 500));
      }
    } catch {
      // Cuerpo inválido: se ignora
    }
    return vacio(200);
  }

  const [devices, dispositivo, registrations, passTypeId, serial] = ruta;
  if (ruta.length !== 5 || devices !== "devices" || registrations !== "registrations") return vacio(404);
  if (![dispositivo, passTypeId, serial].every(valido)) return vacio(404);

  try {
    const a = await tarjetaAutorizada(passTypeId, serial, request.headers.get("authorization"));
    if (!a.ok) return vacio(a.status);

    let pushToken = "";
    try {
      pushToken = String(((await request.json()) as { pushToken?: unknown }).pushToken ?? "");
    } catch {
      return vacio(400);
    }
    if (!/^[0-9a-fA-F]{16,200}$/.test(pushToken)) return vacio(400);

    const nuevo = await registrarDispositivo(a.tarjeta, passTypeId, dispositivo, pushToken);
    return vacio(nuevo ? 201 : 200);
  } catch (e) {
    return error(e);
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const ruta = (await params).ruta;
  const [devices, dispositivo, registrations, passTypeId, serial] = ruta;
  if (ruta.length !== 5 || devices !== "devices" || registrations !== "registrations") return vacio(404);
  if (![dispositivo, passTypeId, serial].every(valido)) return vacio(404);

  try {
    const a = await tarjetaAutorizada(passTypeId, serial, request.headers.get("authorization"));
    if (!a.ok) return vacio(a.status);
    await quitarRegistro(passTypeId, dispositivo, serial);
    return vacio(200);
  } catch (e) {
    return error(e);
  }
}

export async function GET(request: NextRequest, { params }: Contexto) {
  const ruta = (await params).ruta;

  try {
    // Pase actualizado
    if (ruta.length === 3 && ruta[0] === "passes") {
      const [, passTypeId, serial] = ruta;
      if (!valido(passTypeId) || !valido(serial)) return vacio(404);
      const a = await tarjetaAutorizada(passTypeId, serial, request.headers.get("authorization"));
      if (!a.ok) return vacio(a.status);

      const { pase, modificado } = await paseFirmado(a, await origenActual());
      // HTTP solo maneja segundos
      const segundos = Math.floor(modificado.getTime() / 1000);
      const desde = Date.parse(request.headers.get("if-modified-since") ?? "");
      if (!Number.isNaN(desde) && segundos <= Math.floor(desde / 1000)) return vacio(304);

      return new Response(new Uint8Array(pase), {
        headers: {
          "Content-Type": "application/vnd.apple.pkpass",
          "Last-Modified": new Date(segundos * 1000).toUTCString(),
          "Cache-Control": "no-store",
        },
      });
    }

    // Qué tarjetas de este iPhone cambiaron
    if (ruta.length === 4 && ruta[0] === "devices" && ruta[2] === "registrations") {
      const [, dispositivo, , passTypeId] = ruta;
      if (!valido(dispositivo) || !valido(passTypeId)) return vacio(404);
      const resultado = await tarjetasActualizadas(
        passTypeId,
        dispositivo,
        request.nextUrl.searchParams.get("passesUpdatedSince"),
      );
      if (!resultado) return vacio(404);
      if (resultado.seriales.length === 0) return vacio(204);
      return Response.json(
        { serialNumbers: resultado.seriales, lastUpdated: resultado.etiqueta },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return vacio(404);
  } catch (e) {
    return error(e);
  }
}
