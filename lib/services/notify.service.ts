import { prisma } from "@/lib/db/client";
import {
  sendFriendRequestEmail,
  sendFriendAcceptedEmail,
  sendCordadaInviteEmail,
  sendPhotoTagEmail,
} from "@/lib/email";
import { sendPush } from "@/lib/services/push.service";

/**
 * Un sitio por evento para decidir correo y push.
 *
 * Antes cada evento se enviaba desde varias rutas a la vez —solicitud de amistad
 * desde tres, etiquetado desde tres— duplicadas entre web y v1. Eso ya se pagó
 * una vez: `emailNotifications` se respetaba en los correos de solicitud de
 * amistad y no en los de etiquetado, porque alguien tocó una ruta y no sus
 * gemelas. Añadir el push a nueve sitios habría repetido la historia.
 *
 * Ninguna de estas funciones lanza. Las llaman acciones ya consumadas que no se
 * pueden deshacer.
 */

/** Qué interruptor gobierna cada canal. */
type Prefs = {
  email: string;
  language: string | null;
  emailNotifications: boolean;
  activityNotifications: boolean;
  pushNotifications: boolean;
};

const PREFS_SELECT = {
  email: true,
  language: true,
  emailNotifications: true,
  activityNotifications: true,
  pushNotifications: true,
} as const;

async function loadPrefs(userId: string): Promise<Prefs | null> {
  return prisma.user.findUnique({ where: { id: userId }, select: PREFS_SELECT });
}

// ─── Textos del push ─────────────────────────────────────────────────────────
// Van aquí y no en `lib/i18n`, que es el diccionario de la interfaz: esto lo
// renderiza el sistema operativo del destinatario, no ninguna pantalla nuestra.
// Se sigue el mismo patrón que las plantillas de correo en `lib/email.ts`.

type PushCopy = { title: string; body: (a: string, b?: string) => string };

function pick<T>(table: Record<string, T>, locale: string | null): T {
  return table[locale ?? "es"] ?? table.es;
}

const FRIEND_REQUEST: Record<string, PushCopy> = {
  es: { title: "Nueva solicitud",     body: (n) => `${n} quiere ser tu amigo en Peakadex` },
  ca: { title: "Nova sol·licitud",    body: (n) => `${n} vol ser el teu amic a Peakadex` },
  en: { title: "New friend request",  body: (n) => `${n} wants to be your friend on Peakadex` },
  fr: { title: "Nouvelle demande",    body: (n) => `${n} veut devenir ton ami sur Peakadex` },
  de: { title: "Neue Anfrage",        body: (n) => `${n} möchte dein Freund auf Peakadex werden` },
};

const FRIEND_ACCEPTED: Record<string, PushCopy> = {
  es: { title: "Ya sois amigos",      body: (n) => `${n} ha aceptado tu solicitud` },
  ca: { title: "Ja sou amics",        body: (n) => `${n} ha acceptat la teva sol·licitud` },
  en: { title: "You are now friends", body: (n) => `${n} accepted your request` },
  fr: { title: "Vous êtes amis",      body: (n) => `${n} a accepté ta demande` },
  de: { title: "Ihr seid jetzt Freunde", body: (n) => `${n} hat deine Anfrage angenommen` },
};

const CORDADA_INVITE: Record<string, PushCopy> = {
  es: { title: "Invitación a una cordada", body: (n, c) => `${n} te ha invitado a ${c}` },
  ca: { title: "Invitació a una cordada",  body: (n, c) => `${n} t'ha convidat a ${c}` },
  en: { title: "Rope team invitation",     body: (n, c) => `${n} invited you to ${c}` },
  fr: { title: "Invitation à une cordée",  body: (n, c) => `${n} t'a invité à ${c}` },
  de: { title: "Einladung zur Seilschaft", body: (n, c) => `${n} hat dich zu ${c} eingeladen` },
};

const PHOTO_TAG: Record<string, PushCopy> = {
  es: { title: "Te han etiquetado", body: (n, p) => `${n} te ha etiquetado en ${p}` },
  ca: { title: "T'han etiquetat",   body: (n, p) => `${n} t'ha etiquetat a ${p}` },
  en: { title: "You were tagged",   body: (n, p) => `${n} tagged you at ${p}` },
  fr: { title: "Tu as été identifié", body: (n, p) => `${n} t'a identifié à ${p}` },
  de: { title: "Du wurdest markiert", body: (n, p) => `${n} hat dich bei ${p} markiert` },
};

/** Cómo llamar a alguien cuyo nombre no sabemos, en el idioma de quien lee. */
const SOMEONE: Record<string, string> = {
  es: "Alguien", ca: "Algú", en: "Someone", fr: "Quelqu'un", de: "Jemand",
};

/**
 * El nombre con el que presentar a una persona en un aviso.
 *
 * ⚠️ **Nunca el correo.** Una solicitud de amistad llega de alguien que todavía
 * no te conoce, así que enseñar su dirección es revelar un dato personal a un
 * desconocido — y al revés. Antes se hacía `name ?? email`, y como el registro
 * guarda el correo también en `name`, la dirección salía por partida doble.
 *
 * `username` primero, que es lo que muestra el resto de la aplicación: las
 * pastillas de la cordada, las etiquetas de las fotos y el ranking.
 */
async function displayName(userId: string, recipientLocale: string | null): Promise<string> {
  const fallback = SOMEONE[recipientLocale ?? "es"] ?? SOMEONE.es;
  const u = await prisma.user
    .findUnique({ where: { id: userId }, select: { username: true, name: true } })
    .catch(() => null);
  const candidate = u?.username?.trim() || u?.name?.trim() || "";
  // Un `name` con arroba es un correo que el registro copió ahí. Se descarta.
  if (!candidate || candidate.includes("@")) return fallback;
  return candidate;
}

// ─── Eventos ─────────────────────────────────────────────────────────────────

/** Alguien te ha mandado una solicitud de amistad. */
export async function notifyFriendRequest(recipientId: string, senderId: string): Promise<void> {
  try {
    const u = await loadPrefs(recipientId);
    if (!u) return;
    const senderName = await displayName(senderId, u.language);

    if (u.emailNotifications) {
      await sendFriendRequestEmail(u.email, senderName, u.language ?? "es").catch((e: unknown) =>
        console.error("[notify] friendRequest email:", e),
      );
    }
    if (u.pushNotifications) {
      const c = pick(FRIEND_REQUEST, u.language);
      await sendPush(recipientId, { title: c.title, body: c.body(senderName), data: { screen: "friends" } });
    }
  } catch (e) {
    console.error("[notify] notifyFriendRequest:", e);
  }
}

/** Han aceptado la solicitud que mandaste. */
export async function notifyFriendAccepted(recipientId: string, accepterId: string): Promise<void> {
  try {
    const u = await loadPrefs(recipientId);
    if (!u) return;
    const accepterName = await displayName(accepterId, u.language);

    if (u.emailNotifications) {
      await sendFriendAcceptedEmail(u.email, accepterName, u.language ?? "es").catch((e: unknown) =>
        console.error("[notify] friendAccepted email:", e),
      );
    }
    if (u.pushNotifications) {
      const c = pick(FRIEND_ACCEPTED, u.language);
      await sendPush(recipientId, { title: c.title, body: c.body(accepterName), data: { screen: "friends" } });
    }
  } catch (e) {
    console.error("[notify] notifyFriendAccepted:", e);
  }
}

/** Te han invitado a una cordada. */
export async function notifyCordadaInvite(
  recipientId: string,
  inviterId: string,
  cordadaName: string,
  cordadaId: string,
): Promise<void> {
  try {
    const u = await loadPrefs(recipientId);
    if (!u) return;
    const inviterName = await displayName(inviterId, u.language);

    if (u.emailNotifications) {
      await sendCordadaInviteEmail(u.email, inviterName, cordadaName, u.language ?? "es").catch(
        (e: unknown) => console.error("[notify] cordadaInvite email:", e),
      );
    }
    if (u.pushNotifications) {
      const c = pick(CORDADA_INVITE, u.language);
      await sendPush(recipientId, {
        title: c.title,
        body: c.body(inviterName, cordadaName),
        data: { screen: "cordada", id: cordadaId },
      });
    }
  } catch (e) {
    console.error("[notify] notifyCordadaInvite:", e);
  }
}

/**
 * Te han etiquetado en una foto.
 *
 * ⚠️ El correo está gobernado por DOS interruptores, no uno:
 * `activityNotifications` es el específico y `emailNotifications` el general.
 * Se conserva tal cual estaba para no cambiar el comportamiento del correo al
 * meter el push.
 */
export async function notifyPhotoTag(
  recipientId: string,
  taggerId: string,
  peakName: string,
  ascentId: string,
  photoUrl: string,
): Promise<void> {
  try {
    const u = await loadPrefs(recipientId);
    if (!u) return;
    const taggerName = await displayName(taggerId, u.language);

    if (u.activityNotifications && u.emailNotifications) {
      await sendPhotoTagEmail(
        u.email, taggerName, peakName, ascentId, u.language ?? "es", photoUrl,
      ).catch((e: unknown) => console.error("[notify] photoTag email:", e));
    }
    if (u.pushNotifications) {
      const c = pick(PHOTO_TAG, u.language);
      await sendPush(recipientId, {
        title: c.title,
        body: c.body(taggerName, peakName),
        data: { screen: "card", ascentId },
      });
    }
  } catch (e) {
    console.error("[notify] notifyPhotoTag:", e);
  }
}
