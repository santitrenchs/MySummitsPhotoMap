import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// Mock the Prisma client + email sender BEFORE importing the service.
vi.mock("@/lib/db/client", () => ({
  prisma: {
    cordada:       { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    cordadaMember: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    friendship:    { findMany: vi.fn() },
    user:          { findUnique: vi.fn() },
    userStats:     { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({ sendCordadaInviteEmail: vi.fn() }));

import { prisma } from "@/lib/db/client";
import { sendCordadaInviteEmail } from "@/lib/email";
import {
  createCordada,
  inviteToCordada,
  respondToCordadaInvite,
  removeMember,
  deleteCordada,
} from "@/lib/services/cordada.service";

const db = prisma as unknown as {
  cordada:       { findUnique: Mock; create: Mock; delete: Mock };
  cordadaMember: { findUnique: Mock; findMany: Mock; create: Mock; update: Mock; delete: Mock };
  friendship:    { findMany: Mock };
  user:          { findUnique: Mock };
};
const sendEmail = vi.mocked(sendCordadaInviteEmail);

const CORDADA = { id: "c1", name: "Els Matiners", description: null, avatarUrl: null, ownerId: "owner" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("removeMember() — expel / leave authorization", () => {
  beforeEach(() => {
    db.cordada.findUnique.mockResolvedValue(CORDADA);
  });

  it("the owner can expel any member", async () => {
    await expect(removeMember("c1", "owner", "m1")).resolves.toEqual({ ok: true });
    expect(db.cordadaMember.delete).toHaveBeenCalledWith({
      where: { cordadaId_userId: { cordadaId: "c1", userId: "m1" } },
    });
  });

  it("a member can remove themselves (leave)", async () => {
    await expect(removeMember("c1", "m1", "m1")).resolves.toEqual({ ok: true });
    expect(db.cordadaMember.delete).toHaveBeenCalledOnce();
  });

  it("a member can NOT expel another member", async () => {
    await expect(removeMember("c1", "m1", "m2")).rejects.toThrow("Not authorized");
    expect(db.cordadaMember.delete).not.toHaveBeenCalled();
  });

  it("the owner can NOT leave — must delete the cordada instead", async () => {
    await expect(removeMember("c1", "owner", "owner")).rejects.toThrow(/cannot leave/i);
    expect(db.cordadaMember.delete).not.toHaveBeenCalled();
  });

  it("throws when the cordada does not exist", async () => {
    db.cordada.findUnique.mockResolvedValue(null);
    await expect(removeMember("nope", "owner", "m1")).rejects.toThrow("Cordada not found");
  });
});

describe("deleteCordada() — owner-only", () => {
  it("only the owner can delete", async () => {
    db.cordada.findUnique.mockResolvedValue(CORDADA);
    await expect(deleteCordada("c1", "m1")).rejects.toThrow("Only the owner can delete");
    expect(db.cordada.delete).not.toHaveBeenCalled();
  });

  it("the owner deletes successfully", async () => {
    db.cordada.findUnique.mockResolvedValue(CORDADA);
    await expect(deleteCordada("c1", "owner")).resolves.toEqual({ ok: true });
    expect(db.cordada.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });
});

describe("inviteToCordada() — owner-only invites", () => {
  beforeEach(() => {
    db.cordada.findUnique.mockResolvedValue(CORDADA);
    db.cordadaMember.findUnique.mockResolvedValue(null); // no existing membership
    db.cordadaMember.create.mockResolvedValue({ cordadaId: "c1", userId: "m1", status: "PENDING" });
    db.user.findUnique.mockResolvedValue(null); // no email lookup data by default
  });

  it("a non-owner can NOT invite", async () => {
    await expect(inviteToCordada("c1", "m1", "m2")).rejects.toThrow("Only the owner can invite");
    expect(db.cordadaMember.create).not.toHaveBeenCalled();
  });

  it("the owner can NOT invite themselves", async () => {
    await expect(inviteToCordada("c1", "owner", "owner")).rejects.toThrow("Cannot invite yourself");
  });

  it("rejects when the user is already a member or has a pending invite", async () => {
    db.cordadaMember.findUnique.mockResolvedValue({ status: "PENDING" });
    await expect(inviteToCordada("c1", "owner", "m1")).rejects.toThrow(/already a member/);
    expect(db.cordadaMember.create).not.toHaveBeenCalled();
  });

  it("creates a PENDING membership with invitedById on success", async () => {
    await inviteToCordada("c1", "owner", "m1");
    expect(db.cordadaMember.create).toHaveBeenCalledWith({
      data: { cordadaId: "c1", userId: "m1", role: "MEMBER", status: "PENDING", invitedById: "owner" },
    });
  });

  it("sends the invite email only when the invitee has emailNotifications enabled", async () => {
    db.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === "owner"
          ? { name: "Santi", username: "santi" }
          : { email: "friend@example.com", emailNotifications: true, language: "ca" },
      ),
    );
    await inviteToCordada("c1", "owner", "m1");
    expect(sendEmail).toHaveBeenCalledWith("friend@example.com", "santi", "Els Matiners", "ca");
  });

  it("does NOT send email when emailNotifications is off (master kill-switch)", async () => {
    db.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === "owner"
          ? { name: "Santi", username: "santi" }
          : { email: "friend@example.com", emailNotifications: false, language: "es" },
      ),
    );
    await inviteToCordada("c1", "owner", "m1");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("a failing email never breaks the invite (best-effort)", async () => {
    db.user.findUnique.mockImplementation(() =>
      Promise.resolve({ email: "x@example.com", emailNotifications: true, language: "es", name: "n", username: "u" }),
    );
    sendEmail.mockRejectedValue(new Error("resend down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(inviteToCordada("c1", "owner", "m1")).resolves.toMatchObject({ status: "PENDING" });
    consoleSpy.mockRestore();
  });
});

describe("respondToCordadaInvite() — accept / reject", () => {
  it("throws when there is no membership row", async () => {
    db.cordadaMember.findUnique.mockResolvedValue(null);
    await expect(respondToCordadaInvite("c1", "m1", "ACCEPTED")).rejects.toThrow("No pending invite");
  });

  it("throws when the membership is already ACCEPTED (no double-accept)", async () => {
    db.cordadaMember.findUnique.mockResolvedValue({ status: "ACCEPTED" });
    await expect(respondToCordadaInvite("c1", "m1", "ACCEPTED")).rejects.toThrow("No pending invite");
    expect(db.cordadaMember.update).not.toHaveBeenCalled();
  });

  it("REJECTED deletes the row so the user can be re-invited later", async () => {
    db.cordadaMember.findUnique.mockResolvedValue({ status: "PENDING" });
    await expect(respondToCordadaInvite("c1", "m1", "REJECTED")).resolves.toEqual({ ok: true });
    expect(db.cordadaMember.delete).toHaveBeenCalledWith({
      where: { cordadaId_userId: { cordadaId: "c1", userId: "m1" } },
    });
    expect(db.cordadaMember.update).not.toHaveBeenCalled();
  });

  it("ACCEPTED flips the status and stamps joinedAt", async () => {
    db.cordadaMember.findUnique.mockResolvedValue({ status: "PENDING" });
    db.cordadaMember.update.mockResolvedValue({ status: "ACCEPTED" });
    await respondToCordadaInvite("c1", "m1", "ACCEPTED");
    const updateArg = db.cordadaMember.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ cordadaId_userId: { cordadaId: "c1", userId: "m1" } });
    expect(updateArg.data.status).toBe("ACCEPTED");
    expect(updateArg.data.joinedAt).toBeInstanceOf(Date);
  });
});

describe("createCordada() — member validation", () => {
  beforeEach(() => {
    db.cordada.create.mockResolvedValue({ id: "new" });
  });

  it("creates the owner as an ACCEPTED OWNER member", async () => {
    await createCordada("owner", "Nueva");
    const createArg = db.cordada.create.mock.calls[0][0];
    const ownerRow = createArg.data.members.create[0];
    expect(ownerRow).toMatchObject({ userId: "owner", role: "OWNER", status: "ACCEPTED" });
    expect(ownerRow.joinedAt).toBeInstanceOf(Date);
    // No member ids → no friendship validation query
    expect(db.friendship.findMany).not.toHaveBeenCalled();
  });

  it("only ACCEPTED friends survive the invite list; strangers and self are dropped", async () => {
    // Only f1 is an accepted friend of the owner
    db.friendship.findMany.mockResolvedValue([{ requesterId: "owner", addresseeId: "f1" }]);
    await createCordada("owner", "Nueva", undefined, ["f1", "stranger", "owner", "f1"]);

    const createArg = db.cordada.create.mock.calls[0][0];
    const invitees = createArg.data.members.create.slice(1);
    expect(invitees).toEqual([
      { userId: "f1", role: "MEMBER", status: "PENDING", invitedById: "owner" },
    ]);
    // The friendship query receives the deduped list without the owner (self filtered first)
    const friendshipWhere = db.friendship.findMany.mock.calls[0][0].where;
    expect(friendshipWhere.OR[0].addresseeId.in).toEqual(["f1", "stranger"]);
  });

  it("accepts friendship rows in either direction (requester or addressee)", async () => {
    db.friendship.findMany.mockResolvedValue([
      { requesterId: "f1", addresseeId: "owner" }, // inverse direction
    ]);
    await createCordada("owner", "Nueva", "desc", ["f1"]);
    const invitees = db.cordada.create.mock.calls[0][0].data.members.create.slice(1);
    expect(invitees.map((m: { userId: string }) => m.userId)).toEqual(["f1"]);
  });
});
