import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// Mock the Prisma client BEFORE importing the service.
vi.mock("@/lib/db/client", () => ({
  prisma: {
    challenge:            { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    challengePeak:        { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    challengeParticipant: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    ascent:               { findMany: vi.fn() },
    peak:                 { findMany: vi.fn() },
    $transaction:         vi.fn(),
  },
}));

import { prisma } from "@/lib/db/client";
import {
  listChallenges,
  getChallengeDetail,
  joinChallenge,
  leaveChallenge,
  createChallenge,
  updateChallenge,
  MAX_PEAKS_PER_CHALLENGE,
} from "@/lib/services/challenge.service";

const db = prisma as unknown as {
  challenge:            { findUnique: Mock; findMany: Mock; create: Mock; update: Mock; delete: Mock };
  challengePeak:        { findMany: Mock; deleteMany: Mock; createMany: Mock };
  challengeParticipant: { findMany: Mock; upsert: Mock; deleteMany: Mock };
  ascent:               { findMany: Mock };
  peak:                 { findMany: Mock };
  $transaction:         Mock;
};

const USER = "u1";

function peak(id: string, altitudeM: number, extra: Record<string, unknown> = {}) {
  return {
    id, name: id, nameEn: null, altitudeM,
    mountainRange: null, country: "ES", rarityId: null, isMythic: false,
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // $transaction(cb) runs the callback against the same mocked client.
  db.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(prisma));
});

// ── Security: what the detail endpoint is allowed to expose ────────────────────

describe("getChallengeDetail() — visibility rules", () => {
  it("hides an inactive challenge from a non-participant (unpublished content is not guessable)", async () => {
    db.challenge.findUnique.mockResolvedValue({
      id: "c1", slug: "s", name: "n", description: null, coverUrl: null,
      isActive: false, peaks: [], participants: [],
    });

    expect(await getChallengeDetail("c1", USER)).toBeNull();
  });

  it("still shows an inactive challenge to someone already joined (progress must not vanish)", async () => {
    db.challenge.findUnique.mockResolvedValue({
      id: "c1", slug: "s", name: "n", description: null, coverUrl: null,
      isActive: false,
      peaks: [{ peakId: "p1", peak: peak("p1", 3000) }],
      participants: [{ userId: USER }],
    });
    db.ascent.findMany.mockResolvedValue([]);

    const detail = await getChallengeDetail("c1", USER);
    expect(detail).not.toBeNull();
    expect(detail!.isJoined).toBe(true);
    expect(detail!.isActive).toBe(false);
  });

  it("returns null for a challenge that does not exist", async () => {
    db.challenge.findUnique.mockResolvedValue(null);
    expect(await getChallengeDetail("nope", USER)).toBeNull();
  });
});

describe("getChallengeDetail() — done/pending mapping", () => {
  beforeEach(() => {
    db.challenge.findUnique.mockResolvedValue({
      id: "c1", slug: "els-3000", name: "Els 3000", description: null, coverUrl: null,
      isActive: true,
      peaks: [
        { peakId: "low",  peak: peak("low", 3000) },
        { peakId: "high", peak: peak("high", 3404) },
        { peakId: "mid",  peak: peak("mid", 3200) },
      ],
      participants: [{ userId: USER }],
    });
  });

  it("marks only ascended peaks as done and counts progress live", async () => {
    db.ascent.findMany.mockResolvedValue([
      { peakId: "high", date: new Date("2026-05-12"), photos: [{ url: "recent.jpg" }] },
    ]);

    const detail = (await getChallengeDetail("c1", USER))!;
    expect(detail.totalPeaks).toBe(3);
    expect(detail.completedPeaks).toBe(1);
    expect(detail.peaks.find((p) => p.id === "high")!.done).toBe(true);
    expect(detail.peaks.find((p) => p.id === "low")!.done).toBe(false);
    expect(detail.peaks.find((p) => p.id === "low")!.lastAscentDate).toBeNull();
  });

  it("uses the most recent ascent's first photo when a peak was climbed twice", async () => {
    // Service queries ordered by date desc, so the first row per peak is the newest.
    db.ascent.findMany.mockResolvedValue([
      { peakId: "high", date: new Date("2026-05-12"), photos: [{ url: "newest.jpg" }] },
      { peakId: "high", date: new Date("2021-07-01"), photos: [{ url: "older.jpg" }] },
    ]);

    const high = (await getChallengeDetail("c1", USER))!.peaks.find((p) => p.id === "high")!;
    expect(high.photoUrl).toBe("newest.jpg");
    expect(high.lastAscentDate).toEqual(new Date("2026-05-12"));
  });

  it("sorts peaks by altitude descending and reports the highest", async () => {
    db.ascent.findMany.mockResolvedValue([]);

    const detail = (await getChallengeDetail("c1", USER))!;
    expect(detail.peaks.map((p) => p.id)).toEqual(["high", "mid", "low"]);
    expect(detail.maxAltitudeM).toBe(3404);
  });

  it("derives rarity from altitude when the peak has no rarityId", async () => {
    db.ascent.findMany.mockResolvedValue([]);
    const detail = (await getChallengeDetail("c1", USER))!;
    expect(detail.peaks.every((p) => typeof p.rarityId === "string" && p.rarityId.length > 0)).toBe(true);
  });
});

// ── Progress is computed live, never read from a stored counter ────────────────

describe("listChallenges() — live progress", () => {
  it("counts the intersection of the user's peaks with each challenge's peaks", async () => {
    db.challengeParticipant.findMany.mockResolvedValue([
      { challengeId: "c1", challenge: { id: "c1", slug: "a", name: "A", description: null, coverUrl: null, isActive: true,  _count: { peaks: 3 } } },
      { challengeId: "c2", challenge: { id: "c2", slug: "b", name: "B", description: null, coverUrl: null, isActive: false, _count: { peaks: 2 } } },
    ]);
    db.challenge.findMany.mockResolvedValue([]);
    db.ascent.findMany.mockResolvedValue([{ peakId: "p1" }, { peakId: "p2" }]);
    db.challengePeak.findMany.mockResolvedValue([
      { challengeId: "c1", peakId: "p1" },
      { challengeId: "c1", peakId: "p9" },
      { challengeId: "c2", peakId: "p1" },
      { challengeId: "c2", peakId: "p2" },
    ]);

    const { mine } = await listChallenges(USER);
    expect(mine.find((c) => c.id === "c1")!.completedPeaks).toBe(1);
    expect(mine.find((c) => c.id === "c2")!.completedPeaks).toBe(2);
  });

  it("keeps inactive challenges in `mine` but never offers them in `available`", async () => {
    db.challengeParticipant.findMany.mockResolvedValue([
      { challengeId: "c2", challenge: { id: "c2", slug: "b", name: "B", description: null, coverUrl: null, isActive: false, _count: { peaks: 2 } } },
    ]);
    db.challenge.findMany.mockResolvedValue([]);
    db.ascent.findMany.mockResolvedValue([]);
    db.challengePeak.findMany.mockResolvedValue([]);

    const { mine, available } = await listChallenges(USER);
    expect(mine.map((c) => c.id)).toEqual(["c2"]);
    expect(available).toEqual([]);
    // The "available" query must filter on isActive AND exclude joined ones.
    expect(db.challenge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, participants: { none: { userId: USER } } },
      }),
    );
  });

  it("skips the progress queries entirely when the user has joined nothing", async () => {
    db.challengeParticipant.findMany.mockResolvedValue([]);
    db.challenge.findMany.mockResolvedValue([]);

    const { mine } = await listChallenges(USER);
    expect(mine).toEqual([]);
    expect(db.ascent.findMany).not.toHaveBeenCalled();
    expect(db.challengePeak.findMany).not.toHaveBeenCalled();
  });
});

// ── Join / leave ──────────────────────────────────────────────────────────────

describe("joinChallenge()", () => {
  it("refuses an inactive challenge (a leaked id must not grant access)", async () => {
    db.challenge.findUnique.mockResolvedValue({ id: "c1", isActive: false });
    await expect(joinChallenge(USER, "c1")).rejects.toThrow(/not available/i);
    expect(db.challengeParticipant.upsert).not.toHaveBeenCalled();
  });

  it("refuses a challenge that does not exist", async () => {
    db.challenge.findUnique.mockResolvedValue(null);
    await expect(joinChallenge(USER, "nope")).rejects.toThrow(/not found/i);
  });

  it("is idempotent — joining twice does not duplicate the participation", async () => {
    db.challenge.findUnique.mockResolvedValue({ id: "c1", isActive: true });
    await joinChallenge(USER, "c1");
    expect(db.challengeParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { challengeId_userId: { challengeId: "c1", userId: USER } },
        update: {},
      }),
    );
  });
});

describe("leaveChallenge()", () => {
  it("deletes only the requesting user's participation", async () => {
    await leaveChallenge(USER, "c1");
    expect(db.challengeParticipant.deleteMany).toHaveBeenCalledWith({
      where: { challengeId: "c1", userId: USER },
    });
  });
});

// ── Admin input validation ────────────────────────────────────────────────────

describe("createChallenge() — peak list validation", () => {
  beforeEach(() => {
    db.challenge.findUnique.mockResolvedValue(null); // slug is free
    db.challenge.create.mockResolvedValue({ id: "new" });
  });

  it("rejects an empty peak list", async () => {
    await expect(createChallenge({ name: "X", peakIds: [] })).rejects.toThrow(/at least one peak/i);
  });

  it("rejects a list above the cap", async () => {
    const tooMany = Array.from({ length: MAX_PEAKS_PER_CHALLENGE + 1 }, (_, i) => `p${i}`);
    await expect(createChallenge({ name: "X", peakIds: tooMany })).rejects.toThrow(/more than/i);
    expect(db.peak.findMany).not.toHaveBeenCalled();
  });

  it("rejects ids that do not exist in the catalog", async () => {
    db.peak.findMany.mockResolvedValue([{ id: "p1" }]); // asked for two, found one
    await expect(createChallenge({ name: "X", peakIds: ["p1", "ghost"] })).rejects.toThrow(/do not exist/i);
    expect(db.challenge.create).not.toHaveBeenCalled();
  });

  it("deduplicates repeated ids before writing", async () => {
    db.peak.findMany.mockResolvedValue([{ id: "p1" }]);
    await createChallenge({ name: "X", peakIds: ["p1", "p1"] });
    expect(db.challenge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ peaks: { create: [{ peakId: "p1" }] } }),
      }),
    );
  });

  it("requires a name", async () => {
    await expect(createChallenge({ name: "   ", peakIds: ["p1"] })).rejects.toThrow(/name is required/i);
  });

  it("generates an accent-free slug from the name", async () => {
    db.peak.findMany.mockResolvedValue([{ id: "p1" }]);
    await createChallenge({ name: "Cims Mítics de Catalunya", peakIds: ["p1"] });
    expect(db.challenge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "cims-mitics-de-catalunya" }),
      }),
    );
  });
});

describe("updateChallenge() — field isolation", () => {
  beforeEach(() => {
    db.challenge.findUnique.mockResolvedValue({ id: "c1", name: "Old" });
  });

  it("touches only the fields present in the input", async () => {
    await updateChallenge("c1", { isActive: false });
    expect(db.challenge.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { isActive: false },
    });
    // No peakIds given → the peak list is left alone.
    expect(db.challengePeak.deleteMany).not.toHaveBeenCalled();
  });

  it("replaces the whole peak list only when peakIds is provided", async () => {
    db.peak.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    await updateChallenge("c1", { peakIds: ["p1", "p2"] });
    expect(db.challengePeak.deleteMany).toHaveBeenCalledWith({ where: { challengeId: "c1" } });
    expect(db.challengePeak.createMany).toHaveBeenCalledWith({
      data: [{ challengeId: "c1", peakId: "p1" }, { challengeId: "c1", peakId: "p2" }],
    });
  });

  it("does not re-slug when the name is unchanged", async () => {
    await updateChallenge("c1", { name: "Old" });
    const data = db.challenge.update.mock.calls[0][0].data;
    expect(data.slug).toBeUndefined();
  });

  it("throws when the challenge does not exist", async () => {
    db.challenge.findUnique.mockResolvedValue(null);
    await expect(updateChallenge("nope", { isActive: true })).rejects.toThrow(/not found/i);
  });
});
