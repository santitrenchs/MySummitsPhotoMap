import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/services/device-token.service", () => ({
  getUserDeviceTokens: vi.fn(),
  deleteDeviceTokensByIds: vi.fn(),
}));

import { getUserDeviceTokens, deleteDeviceTokensByIds } from "@/lib/services/device-token.service";

/**
 * El access token se cachea a nivel de módulo, que es justo lo que se quiere en
 * producción pero rompe el aislamiento entre tests: el segundo se saltaría el
 * intercambio OAuth2 y los índices de `fetch` se descuadrarían. Importando
 * fresco en cada test, cada uno arranca con la caché vacía.
 */
async function freshSendPush() {
  vi.resetModules();
  return (await import("@/lib/services/push.service")).sendPush;
}

const tokens = getUserDeviceTokens as unknown as Mock;
const purge = deleteDeviceTokensByIds as unknown as Mock;

// Cuenta de servicio de mentira, con una clave PEM real generada al vuelo: sin
// una clave válida `importPKCS8` lanza y no se probaría nada del flujo.
let SA_B64: string;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  tokens.mockResolvedValue([]);
  purge.mockResolvedValue(undefined);

  if (!SA_B64) {
    const { generateKeyPair, exportPKCS8 } = await import("jose");
    const { privateKey } = await generateKeyPair("RS256", { extractable: true });
    SA_B64 = Buffer.from(
      JSON.stringify({
        project_id: "peakadex-test",
        client_email: "svc@peakadex-test.iam.gserviceaccount.com",
        private_key: await exportPKCS8(privateKey),
      }),
    ).toString("base64");
  }
  process.env.FIREBASE_SERVICE_ACCOUNT_B64 = SA_B64;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Encadena respuestas: la primera es siempre la del token OAuth2. */
function mockFetch(...responses: { status: number; json: unknown }[]) {
  const f = vi.fn();
  f.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ access_token: "at-123", expires_in: 3600 }),
  });
  for (const r of responses) {
    f.mockResolvedValueOnce({ ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.json });
  }
  vi.stubGlobal("fetch", f);
  return f;
}

describe("sendPush()", () => {
  it("no envía ni revienta cuando falta la credencial", async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    const f = mockFetch();

    const sendPush = await freshSendPush();
    await expect(sendPush("u1", { title: "t", body: "b" })).resolves.toBe(0);
    // Ni siquiera pide el access token: en local esto es lo normal, no un fallo.
    expect(f).not.toHaveBeenCalled();
  });

  it("no pide el access token si el usuario no tiene dispositivos", async () => {
    tokens.mockResolvedValue([]);
    const f = mockFetch();

    const sendPush = await freshSendPush();
    expect(await sendPush("u1", { title: "t", body: "b" })).toBe(0);
    expect(f).not.toHaveBeenCalled();
  });

  it("envía a cada dispositivo del usuario", async () => {
    tokens.mockResolvedValue([
      { id: "d1", token: "tok1", platform: "android" },
      { id: "d2", token: "tok2", platform: "android" },
    ]);
    const f = mockFetch({ status: 200, json: {} }, { status: 200, json: {} });

    const sendPush = await freshSendPush();
    expect(await sendPush("u1", { title: "Hola", body: "Cuerpo" })).toBe(2);
    // 1 del token OAuth2 + 2 envíos.
    expect(f).toHaveBeenCalledTimes(3);

    const body = JSON.parse((f.mock.calls[1][1] as { body: string }).body);
    expect(body.message.token).toBe("tok1");
    expect(body.message.notification).toEqual({ title: "Hola", body: "Cuerpo" });
  });

  it("purga los tokens que FCM declara muertos, y solo esos", async () => {
    tokens.mockResolvedValue([
      { id: "vivo", token: "tok1", platform: "android" },
      { id: "muerto", token: "tok2", platform: "android" },
      { id: "otro-error", token: "tok3", platform: "android" },
    ]);
    mockFetch(
      { status: 200, json: {} },
      { status: 404, json: { error: { status: "UNREGISTERED" } } },
      // Un 503 es un problema pasajero de FCM: borrar el token aquí perdería un
      // dispositivo perfectamente válido para siempre.
      { status: 503, json: { error: { status: "UNAVAILABLE" } } },
    );

    const sendPush = await freshSendPush();
    expect(await sendPush("u1", { title: "t", body: "b" })).toBe(1);
    expect(purge).toHaveBeenCalledWith(["muerto"]);
  });

  it("no llama a purgar cuando no hay nada muerto", async () => {
    tokens.mockResolvedValue([{ id: "d1", token: "tok1", platform: "android" }]);
    mockFetch({ status: 200, json: {} });

    const sendPush = await freshSendPush();
    await sendPush("u1", { title: "t", body: "b" });
    expect(purge).not.toHaveBeenCalled();
  });

  it("devuelve 0 sin lanzar si el intercambio OAuth2 falla", async () => {
    tokens.mockResolvedValue([{ id: "d1", token: "tok1", platform: "android" }]);
    const f = vi.fn().mockResolvedValue({
      // El caso que importa: 200 con el error dentro del cuerpo, como Resend.
      ok: true,
      status: 200,
      json: async () => ({ error: "invalid_grant", error_description: "Invalid JWT" }),
    });
    vi.stubGlobal("fetch", f);

    const sendPush = await freshSendPush();
    await expect(sendPush("u1", { title: "t", body: "b" })).resolves.toBe(0);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("un error de red en un dispositivo no impide enviar al siguiente", async () => {
    tokens.mockResolvedValue([
      { id: "d1", token: "tok1", platform: "android" },
      { id: "d2", token: "tok2", platform: "android" },
    ]);
    const f = vi.fn();
    f.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: "at", expires_in: 3600 }) });
    f.mockRejectedValueOnce(new Error("ECONNRESET"));
    f.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", f);

    const sendPush = await freshSendPush();
    expect(await sendPush("u1", { title: "t", body: "b" })).toBe(1);
  });

  it("incluye los datos de destino cuando se pasan", async () => {
    tokens.mockResolvedValue([{ id: "d1", token: "tok1", platform: "android" }]);
    const f = mockFetch({ status: 200, json: {} });

    const sendPush = await freshSendPush();
    await sendPush("u1", { title: "t", body: "b", data: { screen: "cordada", id: "c1" } });

    const body = JSON.parse((f.mock.calls[1][1] as { body: string }).body);
    expect(body.message.data).toEqual({ screen: "cordada", id: "c1" });
  });
});

describe("caché del access token", () => {
  it("no vuelve a pedirlo en el segundo envío", async () => {
    // Dura una hora. Pedir uno por notificación sería una llamada de red extra
    // por cada aviso que sale de la aplicación.
    tokens.mockResolvedValue([{ id: "d1", token: "tok1", platform: "android" }]);
    const f = mockFetch({ status: 200, json: {} }, { status: 200, json: {} });
    const sendPush = await freshSendPush();

    await sendPush("u1", { title: "t", body: "b" });
    await sendPush("u1", { title: "t", body: "b" });

    // 1 token + 2 envíos, no 2 tokens + 2 envíos.
    expect(f).toHaveBeenCalledTimes(3);
  });
});
