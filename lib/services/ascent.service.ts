import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { prisma } from "@/lib/db/client";
import { deleteFromR2 } from "@/lib/storage/r2";
import { ensureElevationProfileForPeak } from "@/lib/services/elevation.service";
import { ensureNearbyPeaksForPeak } from "@/lib/services/nearby-peaks.service";

export type CreateAscentInput = {
  peakId: string;
  date: string; // ISO date string "YYYY-MM-DD"
  route?: string;
  description?: string;
  createdBy: string;
};

const PEAK_SELECT = {
  select: { id: true, name: true, nameEn: true, altitudeM: true, mountainRange: true, latitude: true, longitude: true, isMythic: true, elevationProfile: true, nearbyPeaks: true },
} as const;

const PHOTOS_SELECT = {
  orderBy: { createdAt: "asc" as const },
  select: {
    id: true,
    url: true,
    cropAspect: true,
    faceDetections: {
      select: {
        faceTags: {
          select: {
            userId: true,
            user: { select: { id: true, name: true, username: true } },
          },
        },
      },
    },
  },
} as const;

const USER_SELECT = {
  select: { name: true, avatarUrl: true },
} as const;

function buildPersons(photos: { faceDetections: { faceTags: { userId: string | null; user: { id: string; name: string; username: string | null } | null }[] }[] }[]): { id: string; name: string }[] {
  const personMap = new Map<string, { id: string; name: string }>();
  for (const photo of photos) {
    for (const fd of photo.faceDetections) {
      for (const tag of fd.faceTags) {
        if (tag.userId && tag.user) {
          personMap.set(tag.userId, { id: tag.userId, name: tag.user.username ?? tag.user.name });
        }
      }
    }
  }
  return Array.from(personMap.values());
}

// Page size for the chronological (own / seen-friends) streams once pagination is
// requested by the client. Legacy (non-paginated) callers are unaffected — see the
// `paginate` branch below.
const PAGE_SIZE = 20;

// Cap on how many unseen friend ascents the first paginated page will fetch regardless
// of date — mirrors MAX_UNSEEN_FRIENDS in ascent-feed.ts. A friend can back-date an
// ascent long after the fact; a plain chronological `take: PAGE_SIZE` query could bury
// it past the user's scroll depth forever. Fetching the full unseen set up-front (once,
// on the first page) guarantees every unseen ascent is surfaced.
const MAX_UNSEEN_FRIENDS = 50;

const FRIENDS_INCLUDE = (userId: string) => ({
  peak: PEAK_SELECT,
  photos: PHOTOS_SELECT,
  user: USER_SELECT,
  feedSeens: { where: { userId }, select: { seenAt: true } },
});

type AscentRow = {
  id: string;
  peakId: string;
  peak: unknown;
  createdBy: string;
  user: { name: string | null; avatarUrl: string | null } | null;
  date: Date;
  route: string | null;
  description: string | null;
  wikiloc: string | null;
  photos: ({ id: string; url: string; cropAspect: string | null } & Parameters<typeof buildPersons>[0][number])[];
  createdAt: Date;
  feedSeens?: { seenAt: Date }[];
};

function toItem(a: AscentRow, isOwn: boolean) {
  return {
    id: a.id,
    peakId: a.peakId,
    peak: a.peak as { id: string; name: string; nameEn: string | null; altitudeM: number; mountainRange: string | null; latitude: number; longitude: number; isMythic: boolean; elevationProfile: unknown; nearbyPeaks: unknown },
    createdBy: a.createdBy,
    user: a.user ? { id: a.createdBy, name: a.user.name ?? "?", username: null as string | null, avatarUrl: a.user.avatarUrl ?? null } : null,
    isOwn,
    isUnseen: !isOwn && (a.feedSeens?.length ?? 0) === 0,
    date: a.date.toISOString(),
    route: a.route,
    description: a.description,
    wikiloc: a.wikiloc,
    photos: a.photos.map((p) => ({ id: p.id, url: p.url, cropAspect: p.cropAspect ?? null })),
    persons: buildPersons(a.photos as Parameters<typeof buildPersons>[0]),
    createdAt: a.createdAt.toISOString(),
  };
}

export type AscentItem = ReturnType<typeof toItem>;

// Canonical sort — same algorithm as web AscentsClient:
// 1. Unseen friends first, sorted by altitude desc (highest peak = most motivating)
// 2. Everything else (own + seen friends) sorted by date desc
// This sort is done server-side so all clients (web, Android, iOS) get the same order.
// When called on a paginated "skipUnseen" page, no item ever has isUnseen=true (the
// chronological query filters them out), so this degrades to a plain date-desc sort.
function sortCanonical(items: AscentItem[]): AscentItem[] {
  return items.sort((a, b) => {
    if (a.isUnseen !== b.isUnseen) return a.isUnseen ? -1 : 1;
    if (a.isUnseen && b.isUnseen) return b.peak.altitudeM - a.peak.altitudeM;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

function nextCursor(raw: { date: Date }[], pageSize: number): string | null {
  return raw.length === pageSize ? raw[raw.length - 1].date.toISOString() : null;
}

export type ListAscentsPage = {
  items: AscentItem[];
  nextBeforeOwn: string | null;
  nextBeforeFriends: string | null;
  hasMore: boolean;
};

export async function listAscents(tenantId: string, userId: string, friendUserIds: string[]): Promise<AscentItem[]>;
export async function listAscents(
  tenantId: string,
  userId: string,
  friendUserIds: string[],
  opts: { paginate: true; beforeOwn?: Date; beforeFriends?: Date; skipUnseen?: boolean },
): Promise<ListAscentsPage>;
export async function listAscents(
  tenantId: string,
  userId: string,
  friendUserIds: string[],
  opts?: { paginate?: boolean; beforeOwn?: Date; beforeFriends?: Date; skipUnseen?: boolean },
): Promise<AscentItem[] | ListAscentsPage> {
  const db = await getTenantConnection(tenantId);

  if (!opts?.paginate) {
    // Legacy (unpaginated) behavior — kept byte-for-byte for old Android clients that
    // don't send a `cursor` query param. Fetches the user's entire ascent history.
    const [ownRaw, friendsRaw] = await Promise.all([
      db.ascent.findMany({
        where: { tenantId, createdBy: userId },
        orderBy: { date: "desc" },
        include: { peak: PEAK_SELECT, photos: PHOTOS_SELECT, user: USER_SELECT },
      }),
      friendUserIds.length > 0
        ? prisma.ascent.findMany({
            where: { createdBy: { in: friendUserIds } },
            orderBy: { date: "desc" },
            include: FRIENDS_INCLUDE(userId),
          })
        : Promise.resolve([]),
    ]);

    const all = [
      ...ownRaw.map((a) => toItem(a, true)),
      ...friendsRaw.map((a) => toItem(a, false)),
    ];
    return sortCanonical(all);
  }

  const { beforeOwn, beforeFriends, skipUnseen } = opts;

  const ownWhere: Record<string, unknown> = { tenantId, createdBy: userId };
  if (beforeOwn) ownWhere.date = { lt: beforeOwn };

  const chronoFriendsWhere: Record<string, unknown> = { createdBy: { in: friendUserIds } };
  if (beforeFriends) chronoFriendsWhere.date = { lt: beforeFriends };
  if (skipUnseen) chronoFriendsWhere.feedSeens = { some: { userId } };

  const [ownRaw, unseenFriendsRaw, friendsRaw] = await Promise.all([
    db.ascent.findMany({
      where: ownWhere,
      orderBy: { date: "desc" },
      take: PAGE_SIZE,
      include: { peak: PEAK_SELECT, photos: PHOTOS_SELECT, user: USER_SELECT },
    }),
    friendUserIds.length > 0 && !skipUnseen
      ? prisma.ascent.findMany({
          where: { createdBy: { in: friendUserIds }, feedSeens: { none: { userId } } },
          orderBy: { date: "desc" },
          take: MAX_UNSEEN_FRIENDS,
          include: FRIENDS_INCLUDE(userId),
        })
      : Promise.resolve([]),
    friendUserIds.length > 0
      ? prisma.ascent.findMany({
          where: chronoFriendsWhere,
          orderBy: { date: "desc" },
          take: PAGE_SIZE,
          include: FRIENDS_INCLUDE(userId),
        })
      : Promise.resolve([]),
  ]);

  // The chronological fetch may overlap with the dedicated unseen fetch (a recent,
  // still-unseen ascent matches both) — drop those from the chronological side so
  // each ascent is only enriched/merged once.
  const unseenIds = new Set(unseenFriendsRaw.map((a) => a.id));
  const combinedFriendsRaw = [
    ...unseenFriendsRaw,
    ...friendsRaw.filter((a) => !unseenIds.has(a.id)),
  ];

  const items = sortCanonical([
    ...ownRaw.map((a) => toItem(a, true)),
    ...combinedFriendsRaw.map((a) => toItem(a, false)),
  ]);

  const nextBeforeOwn = nextCursor(ownRaw, PAGE_SIZE);
  const nextBeforeFriends = nextCursor(friendsRaw, PAGE_SIZE);

  return {
    items,
    nextBeforeOwn,
    nextBeforeFriends,
    hasMore: nextBeforeOwn !== null || nextBeforeFriends !== null,
  };
}

export async function getAscentedPeakIds(tenantId: string): Promise<string[]> {
  const db = await getTenantConnection(tenantId);
  const rows = await db.ascent.findMany({
    where: { tenantId },
    select: { peakId: true },
    distinct: ["peakId"],
  });
  return rows.map((r) => r.peakId);
}

export async function getAscentMapData(tenantId: string) {
  const db = await getTenantConnection(tenantId);
  const rows = await db.ascent.findMany({
    where: { tenantId },
    orderBy: { date: "desc" }, // newest first → deduplicate keeps most recent per peak
    select: {
      id: true,
      peakId: true,
      date: true,
      route: true,
      photos: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          url: true,
          faceDetections: { select: { boundingBox: true } },
        },
      },
    },
  });
  // Group by peakId — rows already sorted date desc, so index 0 = most recent per peak
  const byPeak = new Map<string, typeof rows[number][]>();
  for (const r of rows) {
    if (!byPeak.has(r.peakId)) byPeak.set(r.peakId, []);
    byPeak.get(r.peakId)!.push(r);
  }

  return Array.from(byPeak.entries()).map(([peakId, ascents]) => {
    const mostRecent = ascents[0];
    // Use photo from the most recent ascent that has one — not necessarily the most recent ascent.
    // This prevents a new text-only ascent from hiding a photo from an older ascent of the same peak.
    const withPhoto = ascents.find(a => a.photos.length > 0);
    const photo = withPhoto?.photos[0] ?? null;
    let faceCenterX: number | null = null;
    let faceCenterY: number | null = null;
    try {
      if (photo && photo.faceDetections.length > 0) {
        const boxes = photo.faceDetections.map(
          (fd) => fd.boundingBox as { x: number; y: number; width: number; height: number }
        );
        faceCenterX = boxes.reduce((sum, b) => sum + b.x + b.width / 2, 0) / boxes.length;
        faceCenterY = boxes.reduce((sum, b) => sum + b.y + b.height / 2, 0) / boxes.length;
      }
    } catch { /* non-critical */ }
    return {
      peakId,
      ascentId: mostRecent.id,
      photoUrl: photo?.url ?? null,
      date: mostRecent.date.toISOString(),
      route: mostRecent.route,
      ascentCount: ascents.length,
      faceCenterX,
      faceCenterY,
    };
  });
}

export async function createAscent(
  tenantId: string,
  input: CreateAscentInput
) {
  const db = await getTenantConnection(tenantId);
  const ascent = await db.ascent.create({
    data: {
      tenantId,
      peakId: input.peakId,
      date: new Date(input.date),
      route: input.route ?? null,
      description: input.description ?? null,
      createdBy: input.createdBy,
    },
    include: {
      peak: { select: { id: true, name: true, altitudeM: true } },
    },
  });

  await Promise.allSettled([
    ensureElevationProfileForPeak(input.peakId),
    ensureNearbyPeaksForPeak(input.peakId),
  ]).then((results) => {
    const [elevationResult, nearbyResult] = results;
    if (elevationResult.status === "rejected") {
      console.error(`[elevation] Failed to cache profile for peak ${input.peakId}:`, elevationResult.reason);
    }
    if (nearbyResult.status === "rejected") {
      console.error(`[nearby-peaks] Failed to cache neighbors for peak ${input.peakId}:`, nearbyResult.reason);
    }
  });

  return ascent;
}

export async function deleteAscent(tenantId: string, ascentId: string, userId: string) {
  const db = await getTenantConnection(tenantId);
  const existing = await db.ascent.findFirst({
    where: { id: ascentId, tenantId, createdBy: userId },
    include: { photos: { select: { storageKey: true, originalStorageKey: true } } },
  });
  if (!existing) return null;

  const deleted = await db.ascent.delete({ where: { id: ascentId } });

  // Best-effort cleanup of the R2 objects (display + resized original). Never block
  // the delete on storage errors — the DB rows are already gone via cascade.
  const keys = existing.photos.flatMap((p) =>
    [p.storageKey, p.originalStorageKey].filter((k): k is string => !!k),
  );
  if (keys.length > 0) {
    await Promise.allSettled(keys.map((k) => deleteFromR2(k)));
  }

  return deleted;
}
