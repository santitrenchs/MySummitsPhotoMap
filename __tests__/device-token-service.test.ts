import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    deviceToken: { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/client";
import {
  registerDeviceToken,
  unregisterDeviceToken,
  getUserDeviceTokens,
  isValidPlatform,
  isValidToken,
} from "@/lib/services/device-token.service";

const db = prisma as unknown as {
  deviceToken: { upsert: Mock; deleteMany: Mock; findMany: Mock };
};

beforeEach(() => {
  vi.clearAllMocks();
  db.deviceToken.upsert.mockResolvedValue({});
  db.deviceToken.deleteMany.mockResolvedValue({ count: 1 });
  db.deviceToken.findMany.mockResolvedValue([]);
});

describe("registerDeviceToken()", () => {
  it("hace upsert por token, no por (userId, token)", async () => {
    // FCM reasigna un token cuando el aparato cambia de dueño. Si la clave
    // incluyera el userId, la fila vieja sobreviviría y el dueño anterior
    // seguiría recibiendo notificaciones de la persona nueva.
    await registerDeviceToken("u1", "tok-abc", "android");

    expect(db.deviceToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: "tok-abc" } }),
    );
  });

  it("reescribe el userId al refrescar, para que el token cambie de dueño", async () => {
    await registerDeviceToken("u2", "tok-abc", "android");

    const arg = db.deviceToken.upsert.mock.calls[0][0];
    expect(arg.update.userId).toBe("u2");
    expect(arg.update.lastSeenAt).toBeInstanceOf(Date);
  });
});

describe("unregisterDeviceToken()", () => {
  it("filtra por userId además de por token", async () => {
    // Sin el userId, cualquiera con una sesión válida podría silenciar el móvil
    // de otro: el token lo lleva cualquier aparato que haya tenido la app.
    await unregisterDeviceToken("u1", "tok-abc");

    expect(db.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", token: "tok-abc" },
    });
  });
});

describe("getUserDeviceTokens()", () => {
  it("devuelve el id además del token, para poder purgar los muertos", async () => {
    await getUserDeviceTokens("u1");

    const arg = db.deviceToken.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ userId: "u1" });
    expect(arg.select.id).toBe(true);
    expect(arg.select.token).toBe(true);
  });
});

describe("validación de entrada", () => {
  it("acepta solo las plataformas conocidas", () => {
    expect(isValidPlatform("android")).toBe(true);
    expect(isValidPlatform("ios")).toBe(true);
    expect(isValidPlatform("web")).toBe(false);
    expect(isValidPlatform(undefined)).toBe(false);
    expect(isValidPlatform(42)).toBe(false);
  });

  it("rechaza tokens vacíos, no-cadena o absurdamente largos", () => {
    expect(isValidToken("tok-abc")).toBe(true);
    expect(isValidToken("")).toBe(false);
    expect(isValidToken(null)).toBe(false);
    expect(isValidToken(123)).toBe(false);
    // Un token de FCM ronda los 200 caracteres; el tope es una cota de cordura
    // para que un cuerpo enorme no llegue a la base de datos.
    expect(isValidToken("x".repeat(4097))).toBe(false);
  });
});
