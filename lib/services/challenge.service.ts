import { prisma } from "@/lib/db/client";
import { getRarityId } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { peakDisplayName } from "@/lib/peak-name";

/**
 * Retos (Challenges) — curated peak lists created by admins; users only join or leave.
 *
 * ⚠️ Progress is NEVER cached. It is computed live by intersecting the user's distinct
 * ascended peakIds with the challenge's peaks. Caching it (à la user_stats) would mean
 * stale rows for every participant whenever an admin edits a challenge's peak list, a
 * backfill on join, and an extra recompute inside the POST /api/ascents critical path.
 * See CLAUDE.md → "Retos (Challenges) — design plan".
 *
 * Like recomputeUserStats(), progress filters by `createdBy` only and ignores tenantId.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type ChallengeSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  totalPeaks: number;
  completedPeaks: number;
  isActive: boolean;
};

export type ChallengeAvailable = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  totalPeaks: number;
};

export type ChallengePeakRow = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
  country: string | null;
  rarityId: RarityId;
  isMythic: boolean;
  done: boolean;
  lastAscentDate: Date | null;
  photoUrl: string | null;
};

export type ChallengeDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isActive: boolean;
  isJoined: boolean;
  totalPeaks: number;
  completedPeaks: number;
  maxAltitudeM: number;
  peaks: ChallengePeakRow[];
};

export type AdminChallengeSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  totalPeaks: number;
  participantCount: number;
  createdAt: Date;
};

export type ChallengeInput = {
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  peakIds: string[];
};

export const MAX_PEAKS_PER_CHALLENGE = 500;

// ── Internals ──────────────────────────────────────────────────────────────────

/** Distinct peakIds the user has ever ascended. Covered by Ascent @@index([createdBy]). */
async function getAscendedPeakIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.ascent.findMany({
    where: { createdBy: userId },
    select: { peakId: true },
    distinct: ["peakId"],
  });
  return new Set(rows.map((r) => r.peakId));
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "reto";
}

/** Finds a free slug, appending -2, -3… on collision. */
async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  for (let i = 1; i < 50; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    const existing = await prisma.challenge.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/** Throws if any peakId does not exist, or the list is empty/oversized/duplicated. */
async function assertValidPeakIds(peakIds: string[]): Promise<string[]> {
  const unique = Array.from(new Set(peakIds));
  if (unique.length === 0) throw new Error("A challenge needs at least one peak");
  if (unique.length > MAX_PEAKS_PER_CHALLENGE) {
    throw new Error(`A challenge cannot have more than ${MAX_PEAKS_PER_CHALLENGE} peaks`);
  }
  const found = await prisma.peak.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  if (found.length !== unique.length) throw new Error("Some peaks do not exist");
  return unique;
}

// ── User-facing queries ────────────────────────────────────────────────────────

/**
 * Both lists in one call.
 * `mine` includes inactive challenges the user already joined (retiring a challenge
 * must never make someone's progress disappear); `available` only active, not-joined ones.
 */
export async function listChallenges(
  userId: string,
): Promise<{ mine: ChallengeSummary[]; available: ChallengeAvailable[] }> {
  const [memberships, available] = await Promise.all([
    prisma.challengeParticipant.findMany({
      where: { userId },
      include: { challenge: { include: { _count: { select: { peaks: true } } } } },
      orderBy: [{ challenge: { sortOrder: "asc" } }, { challenge: { createdAt: "desc" } }],
    }),
    prisma.challenge.findMany({
      where: { isActive: true, participants: { none: { userId } } },
      include: { _count: { select: { peaks: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const joinedIds = memberships.map((m) => m.challengeId);

  // Live progress: user's peaks ∩ each joined challenge's peaks.
  let completedByChallenge = new Map<string, number>();
  if (joinedIds.length > 0) {
    const [ascended, links] = await Promise.all([
      getAscendedPeakIds(userId),
      prisma.challengePeak.findMany({
        where: { challengeId: { in: joinedIds } },
        select: { challengeId: true, peakId: true },
      }),
    ]);
    completedByChallenge = links.reduce((acc, link) => {
      if (ascended.has(link.peakId)) {
        acc.set(link.challengeId, (acc.get(link.challengeId) ?? 0) + 1);
      }
      return acc;
    }, new Map<string, number>());
  }

  return {
    mine: memberships.map((m) => ({
      id: m.challenge.id,
      slug: m.challenge.slug,
      name: m.challenge.name,
      description: m.challenge.description,
      coverUrl: m.challenge.coverUrl,
      totalPeaks: m.challenge._count.peaks,
      completedPeaks: completedByChallenge.get(m.challengeId) ?? 0,
      isActive: m.challenge.isActive,
    })),
    available: available.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      coverUrl: c.coverUrl,
      totalPeaks: c._count.peaks,
    })),
  };
}

/**
 * Detail for one challenge, scoped to the requesting user.
 * Returns null when the challenge is inactive and the user is not a participant —
 * unpublished content must not be reachable by guessing an id.
 * Never accepts a userId from the caller's input: pass the session user only.
 */
export async function getChallengeDetail(
  challengeId: string,
  userId: string,
): Promise<ChallengeDetail | null> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      peaks: {
        include: {
          peak: {
            select: {
              id: true, name: true, nameEn: true, altitudeM: true,
              mountainRange: true, country: true, rarityId: true, isMythic: true,
            },
          },
        },
      },
      participants: { where: { userId }, select: { userId: true } },
    },
  });
  if (!challenge) return null;

  const isJoined = challenge.participants.length > 0;
  if (!challenge.isActive && !isJoined) return null;

  const peakIds = challenge.peaks.map((cp) => cp.peakId);

  // One query for every ascent of the user on these peaks, newest first,
  // with the first photo of each (same shape profile.service.ts uses).
  const ascents = peakIds.length
    ? await prisma.ascent.findMany({
        where: { createdBy: userId, peakId: { in: peakIds } },
        orderBy: { date: "desc" },
        select: {
          peakId: true,
          date: true,
          photos: { orderBy: { createdAt: "asc" }, take: 1, select: { url: true } },
        },
      })
    : [];

  // Ascents are newest-first, so the first hit per peak is the most recent one.
  const byPeak = new Map<string, { date: Date; photoUrl: string | null }>();
  for (const a of ascents) {
    if (!byPeak.has(a.peakId)) {
      byPeak.set(a.peakId, { date: a.date, photoUrl: a.photos[0]?.url ?? null });
    }
  }

  const peaks: ChallengePeakRow[] = challenge.peaks
    .map((cp) => {
      const pk = cp.peak;
      const hit = byPeak.get(pk.id);
      return {
        id: pk.id,
        name: peakDisplayName(pk),
        altitudeM: pk.altitudeM,
        mountainRange: pk.mountainRange,
        country: pk.country ?? null,
        rarityId: (pk.rarityId as RarityId | null) ?? getRarityId(pk.altitudeM),
        isMythic: pk.isMythic ?? false,
        done: !!hit,
        lastAscentDate: hit?.date ?? null,
        photoUrl: hit?.photoUrl ?? null,
      };
    })
    .sort((a, b) => b.altitudeM - a.altitudeM);

  return {
    id: challenge.id,
    slug: challenge.slug,
    name: challenge.name,
    description: challenge.description,
    coverUrl: challenge.coverUrl,
    isActive: challenge.isActive,
    isJoined,
    totalPeaks: peaks.length,
    completedPeaks: peaks.filter((p) => p.done).length,
    maxAltitudeM: peaks.reduce((max, p) => Math.max(max, p.altitudeM), 0),
    peaks,
  };
}

// ── User-facing mutations ──────────────────────────────────────────────────────

/** Idempotent. Rejects inactive challenges so a leaked id can't be used to join. */
export async function joinChallenge(userId: string, challengeId: string): Promise<void> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, isActive: true },
  });
  if (!challenge) throw new Error("Challenge not found");
  if (!challenge.isActive) throw new Error("Challenge is not available");

  await prisma.challengeParticipant.upsert({
    where: { challengeId_userId: { challengeId, userId } },
    create: { challengeId, userId },
    update: {},
  });
}

/** Idempotent. Progress reappears untouched on rejoin (it was never stored). */
export async function leaveChallenge(userId: string, challengeId: string): Promise<void> {
  await prisma.challengeParticipant.deleteMany({ where: { challengeId, userId } });
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export async function adminListChallenges(): Promise<AdminChallengeSummary[]> {
  const rows = await prisma.challenge.findMany({
    include: { _count: { select: { peaks: true, participants: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    coverUrl: c.coverUrl,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    totalPeaks: c._count.peaks,
    participantCount: c._count.participants,
    createdAt: c.createdAt,
  }));
}

/** Admin detail: the challenge plus its peak list (for the editor), no user scoping. */
export async function adminGetChallenge(challengeId: string) {
  const c = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      peaks: {
        include: {
          peak: {
            select: {
              id: true, name: true, nameEn: true, altitudeM: true,
              mountainRange: true, country: true, rarityId: true,
            },
          },
        },
      },
      _count: { select: { participants: true } },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    coverUrl: c.coverUrl,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    participantCount: c._count.participants,
    peaks: c.peaks
      .map((cp) => ({
        id: cp.peak.id,
        name: peakDisplayName(cp.peak),
        altitudeM: cp.peak.altitudeM,
        mountainRange: cp.peak.mountainRange,
        country: cp.peak.country ?? null,
        rarityId: (cp.peak.rarityId as RarityId | null) ?? getRarityId(cp.peak.altitudeM),
      }))
      .sort((a, b) => b.altitudeM - a.altitudeM),
  };
}

export async function createChallenge(input: ChallengeInput): Promise<{ id: string }> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  const peakIds = await assertValidPeakIds(input.peakIds);
  const slug = await uniqueSlug(name);

  const created = await prisma.challenge.create({
    data: {
      slug,
      name,
      description: input.description?.trim() || null,
      coverUrl: input.coverUrl || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      peaks: { create: peakIds.map((peakId) => ({ peakId })) },
    },
    select: { id: true },
  });
  return created;
}

/**
 * Partial update. Only the fields present in `input` are touched (same field-isolation
 * discipline as the ascent PATCH endpoint) — `peakIds` replaces the whole list when given.
 */
export async function updateChallenge(
  challengeId: string,
  input: Partial<ChallengeInput>,
): Promise<void> {
  const existing = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, name: true },
  });
  if (!existing) throw new Error("Challenge not found");

  const data: {
    name?: string;
    slug?: string;
    description?: string | null;
    coverUrl?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Name is required");
    data.name = name;
    if (name !== existing.name) data.slug = await uniqueSlug(name, challengeId);
  }
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.coverUrl !== undefined) data.coverUrl = input.coverUrl || null;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const peakIds = input.peakIds !== undefined ? await assertValidPeakIds(input.peakIds) : null;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.challenge.update({ where: { id: challengeId }, data });
    }
    if (peakIds) {
      await tx.challengePeak.deleteMany({ where: { challengeId } });
      await tx.challengePeak.createMany({
        data: peakIds.map((peakId) => ({ challengeId, peakId })),
      });
    }
  });
}

/** Cascades to challenge_peaks and challenge_participants. */
export async function deleteChallenge(challengeId: string): Promise<void> {
  await prisma.challenge.delete({ where: { id: challengeId } });
}
