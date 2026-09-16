import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getRarityId } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { peakDisplayName } from "@/lib/peak-name";
import type { Locale } from "@/lib/i18n/types";

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
  /**
   * Already-joined challenges stay in this list so the "add" sheet can show them greyed
   * out with a tick, instead of silently hiding what the user just joined. Anything
   * counting "how many are available to join" must exclude these.
   */
  isJoined: boolean;
};

export type ChallengePeakRow = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
  /** Sparse in the catalogue (~10%). The detail only offers sorting by it when the
   *  challenge's own peaks actually carry more than one distinct value. */
  comarca: string | null;
  country: string | null;
  rarityId: RarityId;
  isMythic: boolean;
  done: boolean;
  lastAscentDate: Date | null;
  photoUrl: string | null;
};

/** Shape MapView consumes (`MapPeak`): coordinates, not photos or progress. */
export type ChallengeMapPeak = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  mountainRange: string | null;
  country: string;
  rarityId: string;
  isMythic: boolean;
  rarity: { id: string; name: string; emoji: string; order: number } | null;
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
  translations?: ChallengeTranslations | null;
  coverUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  peakIds: string[];
};

export const MAX_PEAKS_PER_CHALLENGE = 500;

/** Per-locale overrides for a challenge's name/description. */
export type ChallengeTranslations = Partial<
  Record<Locale, { name?: string | null; description?: string | null }>
>;

/**
 * Reads the stored `translations` JSON defensively — it is admin-authored and could be
 * anything, so a malformed value degrades to "no translations" rather than throwing.
 */
export function parseTranslations(raw: unknown): ChallengeTranslations {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as ChallengeTranslations;
}

/**
 * Locale text with fallback to the base column.
 * The base `name`/`description` are what the admin typed first, so a challenge always
 * reads correctly even with no translation filled in for the viewer's language.
 */
function localized(
  base: string,
  raw: unknown,
  locale: Locale,
  field: "name" | "description",
): string {
  const value = parseTranslations(raw)[locale]?.[field];
  return typeof value === "string" && value.trim() ? value : base;
}

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

// ── The challenge's peak list — cached, because it is the same for everyone ────

/** Everything about a challenge peak that does not depend on who is looking. */
type ChallengePeakStatic = Omit<ChallengePeakRow, "done" | "lastAscentDate" | "photoUrl">;

const PEAK_SELECT = {
  id: true, name: true, nameEn: true, altitudeM: true,
  mountainRange: true, comarca: true, country: true, rarityId: true, isMythic: true,
} as const;

const peaksTag = (challengeId: string) => `challenge-peaks:${challengeId}`;

/**
 * The curated list is global and changes only when an admin edits the challenge,
 * while the detail endpoint is the slowest in the app — it was spending two of its
 * round trips re-reading the same 150-522 rows on every visit of every user.
 *
 * Cached by challenge id (`peakDisplayName` is locale-independent, so the locale is
 * not part of the key) and invalidated by tag from updateChallenge/deleteChallenge.
 * The 1h revalidate is a backstop, not the mechanism.
 *
 * Progress is NOT in here and never will be — see the note at the top of this file.
 */
function getChallengePeaks(challengeId: string): Promise<ChallengePeakStatic[]> {
  return unstable_cache(
    async () => {
      const rows = await prisma.challengePeak.findMany({
        where: { challengeId },
        select: { peak: { select: PEAK_SELECT } },
      });
      return rows
        .map(({ peak: pk }) => ({
          id: pk.id,
          name: peakDisplayName(pk),
          altitudeM: pk.altitudeM,
          mountainRange: pk.mountainRange,
          comarca: pk.comarca,
          country: pk.country ?? null,
          rarityId: (pk.rarityId as RarityId | null) ?? getRarityId(pk.altitudeM),
          isMythic: pk.isMythic ?? false,
        }))
        .sort((a, b) => b.altitudeM - a.altitudeM);
    },
    ["challenge-peaks", challengeId],
    { tags: [peaksTag(challengeId)], revalidate: 3600 },
  )();
}

// ── Peak → retos index (the Atlas marks) ───────────────────────────────────────

export type PeakChallengeIndex = {
  /** Ordered by the admin's `sortOrder`; the marks inherit that order everywhere. */
  challenges: {
    id: string;
    name: string;
    coverUrl: string | null;
    totalPeaks: number;
    isActive: boolean;
  }[];
  /** peakId → indices into `challenges`. Indices, not ids: the blob is mostly this map. */
  byPeak: Record<string, number[]>;
};

const PEAK_INDEX_TAG = "challenge-peak-index";

/**
 * Which retos contain each peak, for the marks on the Atlas (the patches on the peak
 * popup and on the list rows).
 *
 * Deliberately **global, not per-user**: the membership of a peak in a curated list
 * is the same fact for everyone, so this is cached once and served to all. The
 * per-user half (which of them you joined, and your progress) comes from
 * `listChallenges` and is merged on the client.
 *
 * Inactive challenges are included, flagged: the client shows a retired reto only to
 * someone who joined it — the same asymmetry `listChallenges` already applies, and
 * the same rule `getChallengeMapPeaks` enforces for the scope.
 *
 * Keyed by locale (challenge *names* are localized, unlike peak names) and
 * invalidated by tag whenever a challenge is created, edited or deleted.
 */
export function getPeakChallengeIndex(locale: Locale = "en"): Promise<PeakChallengeIndex> {
  return unstable_cache(
    async (loc: Locale): Promise<PeakChallengeIndex> => {
      const rows = await prisma.challenge.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true, name: true, translations: true, coverUrl: true, isActive: true,
          peaks: { select: { peakId: true } },
        },
      });

      const challenges = rows.map((c) => ({
        id: c.id,
        name: localized(c.name, c.translations, loc, "name"),
        coverUrl: c.coverUrl,
        totalPeaks: c.peaks.length,
        isActive: c.isActive,
      }));

      const byPeak: Record<string, number[]> = {};
      rows.forEach((c, idx) => {
        for (const { peakId } of c.peaks) {
          (byPeak[peakId] ??= []).push(idx);
        }
      });

      return { challenges, byPeak };
    },
    ["challenge-peak-index"],
    { tags: [PEAK_INDEX_TAG], revalidate: 3600 },
  )(locale);
}

// ── User-facing queries ────────────────────────────────────────────────────────

/**
 * Both lists in one call.
 * `mine` includes inactive challenges the user already joined (retiring a challenge
 * must never make someone's progress disappear); `available` lists every *active*
 * challenge, flagged with `isJoined` so the UI can show joined ones as already taken.
 */
export async function listChallenges(
  userId: string,
  locale: Locale = "en",
): Promise<{ mine: ChallengeSummary[]; available: ChallengeAvailable[] }> {
  const [memberships, available] = await Promise.all([
    prisma.challengeParticipant.findMany({
      where: { userId },
      include: { challenge: { include: { _count: { select: { peaks: true } } } } },
      orderBy: [{ challenge: { sortOrder: "asc" } }, { challenge: { createdAt: "desc" } }],
    }),
    // Every active challenge, joined or not — the sheet greys out the joined ones.
    prisma.challenge.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { peaks: true } },
        participants: { where: { userId }, select: { userId: true } },
      },
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
      name: localized(m.challenge.name, m.challenge.translations, locale, "name"),
      description: m.challenge.description
        ? localized(m.challenge.description, m.challenge.translations, locale, "description")
        : null,
      coverUrl: m.challenge.coverUrl,
      totalPeaks: m.challenge._count.peaks,
      completedPeaks: completedByChallenge.get(m.challengeId) ?? 0,
      isActive: m.challenge.isActive,
    })),
    available: available.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: localized(c.name, c.translations, locale, "name"),
      description: c.description
        ? localized(c.description, c.translations, locale, "description")
        : null,
      coverUrl: c.coverUrl,
      totalPeaks: c._count.peaks,
      isJoined: c.participants.length > 0,
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
  locale: Locale = "en",
): Promise<ChallengeDetail | null> {
  // Two independent reads in parallel instead of Prisma's nested include, which
  // walked challenge → challenge_peaks → peaks → participants one round trip at a
  // time. The peak list comes from the tag-invalidated cache above.
  // Membership is asked for separately rather than as a nested `participants`
  // include: as its own query it rides along in the same parallel wave instead of
  // costing a round trip of its own.
  const [challenge, membership, staticPeaks] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true, slug: true, name: true, description: true, coverUrl: true,
        isActive: true, translations: true,
      },
    }),
    prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
      select: { userId: true },
    }),
    getChallengePeaks(challengeId),
  ]);
  if (!challenge) return null;

  const isJoined = membership !== null;
  if (!challenge.isActive && !isJoined) return null;

  // One query for every ascent of the user on these peaks, newest first,
  // with the first photo of each (same shape profile.service.ts uses).
  const ascents = staticPeaks.length
    ? await prisma.ascent.findMany({
        where: { createdBy: userId, peakId: { in: staticPeaks.map((p) => p.id) } },
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

  // Already sorted by altitude desc in the cached list.
  const peaks: ChallengePeakRow[] = staticPeaks.map((p) => {
    const hit = byPeak.get(p.id);
    return {
      ...p,
      done: !!hit,
      lastAscentDate: hit?.date ?? null,
      photoUrl: hit?.photoUrl ?? null,
    };
  });

  return {
    id: challenge.id,
    slug: challenge.slug,
    name: localized(challenge.name, challenge.translations, locale, "name"),
    description: challenge.description
      ? localized(challenge.description, challenge.translations, locale, "description")
      : null,
    coverUrl: challenge.coverUrl,
    isActive: challenge.isActive,
    isJoined,
    totalPeaks: peaks.length,
    completedPeaks: peaks.filter((p) => p.done).length,
    maxAltitudeM: peaks.reduce((max, p) => Math.max(max, p.altitudeM), 0),
    peaks,
  };
}

/**
 * The challenge's peaks with map coordinates, for the Atlas "challenge mode"
 * (`/map?challenge={id}`). Same access rule as getChallengeDetail: an inactive
 * challenge the user never joined comes back null rather than leaking its peaks.
 *
 * Returns every peak of the challenge — the Atlas deliberately shows them all at
 * once instead of loading per viewport, so there is no `take` here. Challenges are
 * curated and capped at ~500 peaks on create.
 */
export async function getChallengeMapPeaks(
  challengeId: string,
  userId: string,
  locale: Locale = "en",
): Promise<{ id: string; name: string; peaks: ChallengeMapPeak[] } | null> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: {
      id: true, name: true, isActive: true, translations: true,
      participants: { where: { userId }, select: { userId: true } },
      peaks: {
        select: {
          peak: {
            select: {
              id: true, name: true, nameEn: true, latitude: true, longitude: true,
              altitudeM: true, mountainRange: true, country: true, rarityId: true, isMythic: true,
              rarity: { select: { id: true, name: true, emoji: true, order: true } },
            },
          },
        },
      },
    },
  });
  if (!challenge) return null;
  if (!challenge.isActive && challenge.participants.length === 0) return null;

  return {
    id: challenge.id,
    name: localized(challenge.name, challenge.translations, locale, "name"),
    peaks: challenge.peaks.map(({ peak }) => ({
      id: peak.id,
      name: peakDisplayName(peak),
      latitude: peak.latitude,
      longitude: peak.longitude,
      altitudeM: peak.altitudeM,
      mountainRange: peak.mountainRange,
      country: peak.country ?? "",
      rarityId: peak.rarityId ?? getRarityId(peak.altitudeM),
      isMythic: peak.isMythic ?? false,
      rarity: peak.rarity,
    })),
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
    translations: parseTranslations(c.translations),
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
    translations: parseTranslations(c.translations),
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
      translations: (input.translations ?? {}) as object,
      coverUrl: input.coverUrl || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      peaks: { create: peakIds.map((peakId) => ({ peakId })) },
    },
    select: { id: true },
  });
  // The Atlas marks read a global peak → retos index: a new reto has to reach it.
  revalidateTag(PEAK_INDEX_TAG, "max");
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
    translations?: object;
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
  if (input.translations !== undefined) data.translations = (input.translations ?? {}) as object;
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

  // The peak list is cached globally: an edit has to reach every user's next read.
  if (peakIds) revalidateTag(peaksTag(challengeId), "max");
  // The Atlas index also carries the name, the patch and isActive, so any of these
  // invalidates it — not just a change of peaks.
  revalidateTag(PEAK_INDEX_TAG, "max");
}

/** Cascades to challenge_peaks and challenge_participants. */
export async function deleteChallenge(challengeId: string): Promise<void> {
  await prisma.challenge.delete({ where: { id: challengeId } });
  revalidateTag(peaksTag(challengeId), "max");
  revalidateTag(PEAK_INDEX_TAG, "max");
}
