import { SignJWT, importPKCS8 } from "jose";
import { getUserDeviceTokens, deleteDeviceTokensByIds } from "@/lib/services/device-token.service";

/**
 * Envío de notificaciones push por FCM HTTP v1.
 *
 * ⚠️ La API legacy de FCM (la de la "server key" en una cabecera) está apagada
 * desde 2024. HTTP v1 se autentica con OAuth2: se firma un JWT con la clave
 * privada de una cuenta de servicio y se canjea por un access token.
 *
 * La credencial viaja en `FIREBASE_SERVICE_ACCOUNT_B64`, el JSON de la cuenta de
 * servicio en base64. El base64 no aporta seguridad —es reversible— pero evita
 * que los saltos de línea de la clave PEM se estropeen al pasar por el campo de
 * texto de un panel web.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

export type PushPayload = {
  title: string;
  body: string;
  /** Viaja en `data` para que el cliente sepa qué pantalla abrir. */
  data?: Record<string, string>;
};

function readServiceAccount(): ServiceAccount | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) return null;
  try {
    const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as ServiceAccount;
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null;
    return sa;
  } catch {
    return null;
  }
}

// El access token dura una hora. Pedir uno por notificación sería una llamada de
// red extra por cada aviso, así que se cachea en el módulo y se renueva con un
// minuto de margen para no usarlo justo cuando expira.
let cached: { token: string; expiresAt: number } | null = null;
const RENEW_MARGIN_MS = 60_000;

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  if (cached && Date.now() < cached.expiresAt - RENEW_MARGIN_MS) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(sa.private_key, "RS256");
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(sa.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: string; error_description?: string }
    | null;

  // Se mira el cuerpo y no solo el status: es la misma trampa que con Resend,
  // que responde 200 con el error dentro.
  if (!res.ok || !json?.access_token) {
    console.error("[push] no se pudo obtener el access token:", json?.error, json?.error_description);
    return null;
  }

  cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cached.token;
}

/** Los errores de FCM que significan «este token ya no existe, bórralo». */
function isDeadToken(status: number, errStatus?: string): boolean {
  // 404 + NOT_FOUND es la desinstalación; UNREGISTERED es el token caducado.
  // INVALID_ARGUMENT sobre el campo `token` es basura que nunca fue válida.
  return (
    status === 404 ||
    errStatus === "NOT_FOUND" ||
    errStatus === "UNREGISTERED" ||
    errStatus === "INVALID_ARGUMENT"
  );
}

/**
 * Manda una notificación a todos los dispositivos del usuario.
 *
 * Best-effort a propósito: nunca lanza. Esto lo llaman acciones que ya han
 * ocurrido —alguien te ha etiquetado, alguien te ha invitado— y que no se pueden
 * deshacer. Un fallo de FCM no puede convertir una acción consumada en un 500.
 *
 * Devuelve cuántos envíos salieron bien, para poder registrarlo.
 */
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  try {
    const sa = readServiceAccount();
    if (!sa) {
      // Sin credencial no es un error: en local y en cualquier entorno sin la
      // variable puesta, el push simplemente no existe. Mejor un aviso claro que
      // una excepción en mitad de una ruta que no va de esto.
      console.warn("[push] FIREBASE_SERVICE_ACCOUNT_B64 no configurada; no se envía nada");
      return 0;
    }

    const devices = await getUserDeviceTokens(userId);
    if (devices.length === 0) return 0;

    const accessToken = await getAccessToken(sa);
    if (!accessToken) return 0;

    const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
    const dead: string[] = [];
    let sent = 0;

    // En serie y no en paralelo: son uno o dos dispositivos por persona, y así un
    // 429 de FCM no se multiplica por el número de aparatos.
    for (const device of devices) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: device.token,
              notification: { title: payload.title, body: payload.body },
              ...(payload.data ? { data: payload.data } : {}),
              // `default` usa el canal que declare el cliente. Sin esto, Android
              // entrega en el canal por omisión y el usuario no puede silenciar
              // una categoría sin silenciarlas todas.
              android: { priority: "high", notification: { channel_id: "default" } },
            },
          }),
        });

        if (res.ok) {
          sent++;
          continue;
        }

        const err = (await res.json().catch(() => null)) as
          | { error?: { status?: string; message?: string } }
          | null;
        const errStatus = err?.error?.status;

        if (isDeadToken(res.status, errStatus)) {
          dead.push(device.id);
        } else {
          console.error("[push] envío fallido:", res.status, errStatus, err?.error?.message);
        }
      } catch (err) {
        console.error("[push] error de red enviando a un dispositivo:", err);
      }
    }

    if (dead.length > 0) {
      await deleteDeviceTokensByIds(dead).catch((err: unknown) =>
        console.error("[push] no se pudieron purgar los tokens muertos:", err),
      );
    }

    return sent;
  } catch (err) {
    console.error("[push] sendPush falló entero:", err);
    return 0;
  }
}
