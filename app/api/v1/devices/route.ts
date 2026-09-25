import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import {
  registerDeviceToken,
  unregisterDeviceToken,
  isValidPlatform,
  isValidToken,
} from "@/lib/services/device-token.service";

/**
 * POST /api/v1/devices — registra el dispositivo para recibir push.
 *
 * Lo llama el cliente al iniciar sesión y cada vez que FCM rota el token, que lo
 * hace por su cuenta. Es idempotente: repetirlo solo refresca `lastSeenAt`.
 *
 * El `userId` sale del JWT y de ningún otro sitio. Aceptarlo en el cuerpo
 * convertiría esto en un primitivo para mandarle notificaciones al móvil de
 * quien te apetezca.
 */
export async function POST(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const token = (body as { token?: unknown } | null)?.token;
    const platform = (body as { platform?: unknown } | null)?.platform;

    if (!isValidToken(token) || !isValidPlatform(platform)) {
      return NextResponse.json({ error: "invalid token or platform" }, { status: 400 });
    }

    await registerDeviceToken(session.userId, token, platform);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/v1/devices POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/devices — da de baja el dispositivo, al cerrar sesión.
 *
 * Con cuerpo, porque el token no cabe con holgura en una URL y acabaría en los
 * logs de acceso de todo lo que haya por el camino.
 *
 * Responde `ok` aunque no hubiera nada que borrar: el cliente cierra sesión
 * igual, y distinguir los dos casos solo serviría para sondear tokens ajenos.
 */
export async function DELETE(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const token = (body as { token?: unknown } | null)?.token;

    if (!isValidToken(token)) {
      return NextResponse.json({ error: "invalid token" }, { status: 400 });
    }

    await unregisterDeviceToken(session.userId, token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/v1/devices DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
