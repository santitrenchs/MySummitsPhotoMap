import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// Mock Prisma, el correo y R2 ANTES de importar el servicio.
vi.mock("@/lib/db/client", () => ({
  prisma: {
    user:           { findUnique: vi.fn(), delete: vi.fn() },
    ascent:         { count: vi.fn() },
    membership:     { count: vi.fn(), deleteMany: vi.fn() },
    tenant:         { delete: vi.fn() },
    photo:          { findMany: vi.fn() },
    deletedUserLog: { create: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({ notifyUserDeleted: vi.fn() }));
vi.mock("@/lib/storage/r2", () => ({ deleteFromR2: vi.fn() }));

import { prisma } from "@/lib/db/client";
import { deleteFromR2 } from "@/lib/storage/r2";
import { deleteAccount } from "@/lib/services/account.service";

const db = prisma as unknown as {
  user:           { findUnique: Mock; delete: Mock };
  ascent:         { count: Mock };
  membership:     { count: Mock; deleteMany: Mock };
  tenant:         { delete: Mock };
  photo:          { findMany: Mock };
  deletedUserLog: { create: Mock };
};
const r2 = vi.mocked(deleteFromR2);

const USER = {
  id: "u1",
  email: "santi@example.com",
  name: "Santi",
  username: "santi",
  createdAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue(USER);
  db.ascent.count.mockResolvedValue(3);
  db.deletedUserLog.create.mockResolvedValue({});
  db.photo.findMany.mockResolvedValue([]);
  r2.mockResolvedValue(undefined);
});

describe("deleteAccount() — limpieza de R2", () => {
  it("borra los ficheros de las fotos y el avatar cuando es el único miembro", async () => {
    db.membership.count.mockResolvedValue(1);
    db.photo.findMany.mockResolvedValue([
      { storageKey: "tenant/t1/photos/p1.jpg", originalStorageKey: "tenant/t1/photos/p1_original.jpg" },
      { storageKey: "tenant/t1/photos/p2.jpg", originalStorageKey: null }, // foto antigua, sin original
    ]);

    const ok = await deleteAccount("u1", "t1");

    expect(ok).toBe(true);
    const deleted = r2.mock.calls.map((c) => c[0]);
    expect(deleted).toEqual([
      "tenant/t1/photos/p1.jpg",
      "tenant/t1/photos/p1_original.jpg",
      "tenant/t1/photos/p2.jpg",
      "avatars/u1.jpg",
    ]);
  });

  it("lee las claves ANTES de borrar el tenant", async () => {
    // Si se leyeran después de la cascada no quedaría ninguna fila que consultar
    // y los ficheros se quedarían huérfanos en el bucket para siempre.
    const order: string[] = [];
    db.membership.count.mockResolvedValue(1);
    db.photo.findMany.mockImplementation(async () => { order.push("findMany"); return []; });
    db.tenant.delete.mockImplementation(async () => { order.push("tenantDelete"); return {}; });

    await deleteAccount("u1", "t1");

    expect(order).toEqual(["findMany", "tenantDelete"]);
  });

  it("no toca las fotos en un tenant compartido: sobreviven a quien se va", async () => {
    db.membership.count.mockResolvedValue(3);

    await deleteAccount("u1", "t1");

    expect(db.tenant.delete).not.toHaveBeenCalled();
    expect(db.photo.findMany).not.toHaveBeenCalled();
    // El avatar sí: es de la persona, no del tenant.
    expect(r2.mock.calls.map((c) => c[0])).toEqual(["avatars/u1.jpg"]);
  });

  it("un fallo del bucket no tumba un borrado que ya ha ocurrido", async () => {
    db.membership.count.mockResolvedValue(1);
    db.photo.findMany.mockResolvedValue([{ storageKey: "k1", originalStorageKey: null }]);
    r2.mockRejectedValue(new Error("R2 caído"));

    // La cuenta ya no existe y al usuario se le ha dicho que sí. Devolver un 500
    // le invitaría a reintentar un borrado que no se puede repetir.
    await expect(deleteAccount("u1", "t1")).resolves.toBe(true);
  });

  it("devuelve false sin tocar nada si el usuario ya no existe", async () => {
    db.user.findUnique.mockResolvedValue(null);

    expect(await deleteAccount("u1", "t1")).toBe(false);
    expect(db.user.delete).not.toHaveBeenCalled();
    expect(r2).not.toHaveBeenCalled();
  });
});
