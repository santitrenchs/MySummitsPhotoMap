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
    cordada:        { findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cordadaMember:  { findFirst: vi.fn(), update: vi.fn() },
    $transaction:   vi.fn(),
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
  cordada:        { findMany: Mock; update: Mock; delete: Mock };
  cordadaMember:  { findFirst: Mock; update: Mock };
  $transaction:   Mock;
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
  db.cordada.findMany.mockResolvedValue([]);
  db.cordadaMember.findFirst.mockResolvedValue(null);
  db.$transaction.mockResolvedValue([]);
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

describe("deleteAccount() — cordadas que posee el usuario", () => {
  beforeEach(() => {
    db.membership.count.mockResolvedValue(1);
  });

  it("transfiere la propiedad al miembro aceptado más antiguo", async () => {
    db.cordada.findMany.mockResolvedValue([{ id: "c1" }]);
    db.cordadaMember.findFirst.mockResolvedValue({ userId: "u2" });

    await deleteAccount("u1", "t1");

    // Excluye al que se va y a los invitados que aún no han aceptado: despertarse
    // siendo dueño de un grupo al que no te habías unido es peor que no heredarlo.
    expect(db.cordadaMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cordadaId: "c1", userId: { not: "u1" }, status: "ACCEPTED" },
        orderBy: [{ joinedAt: "asc" }, { createdAt: "asc" }],
      }),
    );
    // Las dos escrituras van juntas: un ownerId que no coincide con el rol OWNER
    // en cordada_members rompe las comprobaciones de permiso del servicio.
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.cordada.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { ownerId: "u2" },
    });
    expect(db.cordadaMember.update).toHaveBeenCalledWith({
      where: { cordadaId_userId: { cordadaId: "c1", userId: "u2" } },
      data: { role: "OWNER" },
    });
    expect(db.cordada.delete).not.toHaveBeenCalled();
  });

  it("disuelve la cordada cuando no queda nadie a quien transferirla", async () => {
    db.cordada.findMany.mockResolvedValue([{ id: "c1" }]);
    db.cordadaMember.findFirst.mockResolvedValue(null);

    await deleteAccount("u1", "t1");

    expect(db.cordada.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("transfiere antes de borrar al usuario", async () => {
    // Cordada.owner es una relación obligatoria sin onDelete, así que Prisma la
    // trata como Restrict: al revés, user.delete() lanzaría y quien hubiera creado
    // una cordada no podría darse de baja.
    const order: string[] = [];
    db.cordada.findMany.mockResolvedValue([{ id: "c1" }]);
    db.cordadaMember.findFirst.mockResolvedValue({ userId: "u2" });
    db.$transaction.mockImplementation(async () => { order.push("transfer"); return []; });
    db.user.delete.mockImplementation(async () => { order.push("userDelete"); return {}; });

    await deleteAccount("u1", "t1");

    expect(order).toEqual(["transfer", "userDelete"]);
  });
});
