import { prisma } from "@/lib/db/client";

export type DevicePlatform = "android" | "ios";

/** Cota de cordura sobre el token de FCM, que ronda los 160-200 caracteres. */
const MAX_TOKEN_LENGTH = 4096;

export function isValidPlatform(v: unknown): v is DevicePlatform {
  return v === "android" || v === "ios";
}

export function isValidToken(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= MAX_TOKEN_LENGTH;
}

/**
 * Registra el dispositivo del usuario, o refresca el que ya estaba.
 *
 * El upsert va por `token` y no por `(userId, token)` a propósito: FCM reasigna
 * un token cuando el aparato cambia de dueño, así que si la fila siguiera
 * apuntando al usuario anterior le llegarían a él notificaciones de otra
 * persona. Reescribir el `userId` es justamente lo que hay que hacer.
 */
export async function registerDeviceToken(
  userId: string,
  token: string,
  platform: DevicePlatform,
): Promise<void> {
  await prisma.deviceToken.upsert({
    where:  { token },
    create: { userId, token, platform },
    update: { userId, platform, lastSeenAt: new Date() },
  });
}

/**
 * Da de baja un token, al cerrar sesión.
 *
 * Filtra por `userId` además de por token: sin eso, cualquiera con una sesión
 * válida podría silenciar el móvil de otro mandando su token. Que haga falta
 * conocerlo no lo convierte en un secreto — lo lleva cualquier aparato que haya
 * tenido la app instalada.
 */
export async function unregisterDeviceToken(userId: string, token: string): Promise<void> {
  await prisma.deviceToken.deleteMany({ where: { userId, token } });
}

/**
 * Los tokens a los que escribir para avisar a este usuario.
 *
 * Devuelve el token y su id: quien envía necesita el id para borrar la fila
 * cuando FCM responda que ya no existe (fase 2).
 */
export async function getUserDeviceTokens(
  userId: string,
): Promise<{ id: string; token: string; platform: string }[]> {
  return prisma.deviceToken.findMany({
    where:  { userId },
    select: { id: true, token: true, platform: true },
  });
}
