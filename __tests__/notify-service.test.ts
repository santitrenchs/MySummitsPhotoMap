import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db/client", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock("@/lib/email", () => ({
  sendFriendRequestEmail:  vi.fn(),
  sendFriendAcceptedEmail: vi.fn(),
  sendCordadaInviteEmail:  vi.fn(),
  sendPhotoTagEmail:       vi.fn(),
}));
vi.mock("@/lib/services/push.service", () => ({ sendPush: vi.fn() }));

import { prisma } from "@/lib/db/client";
import {
  sendFriendRequestEmail,
  sendFriendAcceptedEmail,
  sendCordadaInviteEmail,
  sendPhotoTagEmail,
} from "@/lib/email";
import { sendPush } from "@/lib/services/push.service";
import {
  notifyFriendRequest,
  notifyFriendAccepted,
  notifyCordadaInvite,
  notifyPhotoTag,
} from "@/lib/services/notify.service";

const db = prisma as unknown as { user: { findUnique: Mock } };
const reqEmail  = sendFriendRequestEmail  as unknown as Mock;
const accEmail  = sendFriendAcceptedEmail as unknown as Mock;
const cordEmail = sendCordadaInviteEmail  as unknown as Mock;
const tagEmail  = sendPhotoTagEmail       as unknown as Mock;
const push      = sendPush                as unknown as Mock;

/**
 * Lo que devuelve `findUnique`. Se usa para las DOS consultas del servicio —las
 * preferencias del destinatario y el nombre del remitente—, así que lleva los
 * campos de ambas; el mock ignora el `select`.
 */
function prefs(over: Partial<Record<string, unknown>> = {}) {
  return {
    email: "dest@example.com",
    language: "es",
    emailNotifications: true,
    activityNotifications: true,
    pushNotifications: true,
    username: "santi",
    name: "Santi Trenchs",
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue(prefs());
  for (const m of [reqEmail, accEmail, cordEmail, tagEmail]) m.mockResolvedValue(undefined);
  push.mockResolvedValue(1);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("los dos canales son independientes", () => {
  it("sin correo pero con push, solo manda push", async () => {
    db.user.findUnique.mockResolvedValue(prefs({ emailNotifications: false }));
    await notifyFriendRequest("u1", "Santi");

    expect(reqEmail).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("sin push pero con correo, solo manda correo", async () => {
    // Es el motivo de separar los interruptores: apagar los emails no puede
    // dejarte sin avisos en el móvil sin haberlo pedido, ni al revés.
    db.user.findUnique.mockResolvedValue(prefs({ pushNotifications: false }));
    await notifyFriendRequest("u1", "Santi");

    expect(reqEmail).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("con los dos apagados no manda nada", async () => {
    db.user.findUnique.mockResolvedValue(
      prefs({ emailNotifications: false, pushNotifications: false }),
    );
    await notifyFriendRequest("u1", "Santi");

    expect(reqEmail).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("etiquetado en foto", () => {
  it("el correo sigue necesitando LOS DOS interruptores", async () => {
    // activityNotifications es el específico y emailNotifications el general.
    // Se conserva tal cual para no cambiar el comportamiento del correo al
    // introducir el push.
    db.user.findUnique.mockResolvedValue(prefs({ activityNotifications: false }));
    await notifyPhotoTag("u1", "Santi", "Aneto", "a1", "https://x/y.jpg");

    expect(tagEmail).not.toHaveBeenCalled();
    // Pero el push no depende de ese interruptor: tiene el suyo.
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("lleva el ascentId para poder abrir la carta", async () => {
    await notifyPhotoTag("u1", "Santi", "Aneto", "a-123", "https://x/y.jpg");

    expect(push).toHaveBeenCalledWith("u1", expect.objectContaining({
      data: { screen: "card", ascentId: "a-123" },
    }));
  });
});

describe("idioma del push", () => {
  it("usa el del perfil del destinatario", async () => {
    db.user.findUnique.mockResolvedValue(prefs({ language: "en" }));
    await notifyFriendRequest("u1", "Santi");

    const arg = push.mock.calls[0][1];
    expect(arg.title).toBe("New friend request");
    expect(arg.body).toContain("santi");
  });

  it("cae a castellano con un idioma desconocido o nulo", async () => {
    db.user.findUnique.mockResolvedValue(prefs({ language: null }));
    await notifyFriendRequest("u1", "Santi");
    expect(push.mock.calls[0][1].title).toBe("Nueva solicitud");

    push.mockClear();
    db.user.findUnique.mockResolvedValue(prefs({ language: "pt" }));
    await notifyFriendRequest("u1", "Santi");
    expect(push.mock.calls[0][1].title).toBe("Nueva solicitud");
  });
});

describe("cada evento manda lo suyo", () => {
  it("amistad aceptada", async () => {
    await notifyFriendAccepted("u1", "Clara");
    expect(accEmail).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][1].data).toEqual({ screen: "friends" });
  });

  it("invitación a cordada lleva el id del grupo", async () => {
    await notifyCordadaInvite("u1", "Clara", "Els Matiners", "c-99");
    expect(cordEmail).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][1].data).toEqual({ screen: "cordada", id: "c-99" });
    expect(push.mock.calls[0][1].body).toContain("Els Matiners");
  });
});

describe("nunca tumba la acción que lo originó", () => {
  it("si el destinatario ya no existe, no manda nada y no lanza", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(notifyFriendRequest("u1", "Santi")).resolves.toBeUndefined();
    expect(reqEmail).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("un fallo del correo no impide el push", async () => {
    reqEmail.mockRejectedValue(new Error("Resend caído"));
    await expect(notifyFriendRequest("u1", "Santi")).resolves.toBeUndefined();
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("un fallo de la consulta de preferencias no lanza", async () => {
    db.user.findUnique.mockRejectedValue(new Error("DB caída"));
    await expect(notifyPhotoTag("u1", "S", "Aneto", "a1", "u")).resolves.toBeUndefined();
  });
});

describe("cómo se nombra a quien manda el aviso", () => {
  it("usa el username, que es lo que muestra el resto de la aplicación", async () => {
    db.user.findUnique.mockResolvedValue(prefs({ username: "clarademiguel", name: "Clara de Miguel" }));
    await notifyFriendRequest("u1", "u2");

    expect(push.mock.calls[0][1].body).toContain("clarademiguel");
  });

  it("NUNCA enseña el correo de quien manda", async () => {
    // Una solicitud de amistad llega de alguien que todavía no te conoce:
    // enseñar su dirección es revelar un dato personal a un desconocido. Y el
    // registro copia el correo también en `name`, así que salía por partida
    // doble con el viejo `name ?? email`.
    db.user.findUnique.mockResolvedValue(
      prefs({ username: null, name: "testpdx1@mailinator.com", language: "es" }),
    );
    await notifyFriendRequest("u1", "u2");

    const body = push.mock.calls[0][1].body;
    expect(body).not.toContain("@");
    expect(body).toContain("Alguien");
  });

  it("el genérico va en el idioma de quien lee, no de quien manda", async () => {
    db.user.findUnique.mockResolvedValue(prefs({ username: null, name: null, language: "en" }));
    await notifyFriendRequest("u1", "u2");

    expect(push.mock.calls[0][1].body).toContain("Someone");
  });
});
