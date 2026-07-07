import { prisma } from "@/lib/db/client";
import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { getPeakStats } from "@/lib/services/peak.service";
import {
  buildFilters,
  mergeFeedStreams,
  nextStreamCursor,
  type View,
  type Rarity,
  type TimeRange,
} from "@/lib/services/feed-merge";

export type { View, Rarity, TimeRange };

export const PAGE_SIZE = 10;

export const PHOTOS_INCLUDE = {
  orderBy: { createdAt: "asc" as const },
  select: {
    id: true,
    url: true,
    originalStorageKey: true,
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

type RawAscent = {
  id: string;
  date: Date;
  route: string | null;
  description: string | null;
  wikiloc: string | null;
  createdBy: string;
  peakId: string;
  peak: {
    id: string; name: string; nameEn: string | null; altitudeM: number; isMythic: boolean;
    mountainRange: string | null; latitude: number; longitude: number;
  };
  photos: {
    id: string; url: string; originalStorageKey: string | null; cropAspect: string | null;
    faceDetections: { faceTags: { userId: string | null; user: { id: string; name: string; username: string | null } | null }[] }[];
  }[];
  user: { name?: string | null; avatarUrl?: string | null } | null;
};

export function enrichAscent(
  a: RawAscent,
  isOwn: boolean,
  locale: string,
  feedSeens?: { seenAt: Date }[],
) {
  const firstPhoto = a.photos[0] ?? null;
  const personMap = new Map<string, { id: string; name: string; email: string | null }>();
  for (const photo of a.photos) {
    for (const fd of photo.faceDetections) {
      for (const tag of fd.faceTags) {
        if (tag.userId && tag.user) {
          personMap.set(tag.userId, { id: tag.userId, name: tag.user.username ?? tag.user.name, email: null });
        }
      }
    }
  }
  return {
    id: a.id,
    date: a.date.toISOString(),
    route: a.route,
    description: a.description,
    wikiloc: a.wikiloc,
    createdByUserId: a.createdBy,
    peak: a.peak,
    firstPhotoId: firstPhoto?.id ?? null,
    firstPhotoUrl: firstPhoto?.url ?? null,
    firstPhotoOriginalKey: firstPhoto?.originalStorageKey ?? null,
    firstPhotoCropAspect: firstPhoto?.cropAspect ?? null,
    persons: Array.from(personMap.values()),
    isOwn,
    isUnseen: feedSeens ? feedSeens.length === 0 : false,
    userName: a.user?.name ?? "?",
    userAvatarUrl: a.user?.avatarUrl ?? null,
  };
}

// View / Rarity / TimeRange types + buildFilters live in feed-merge.ts (pure, unit-tested).

const ASCENT_INCLUDE = {
  peak: { select: { id: true, name: true, nameEn: true, altitudeM: true, isMythic: true, mountainRange: true, latitude: true, longitude: true } },
  photos: PHOTOS_INCLUDE,
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

const ASCENT_INCLUDE_WITH_SEEN = (userId: string) => ({
  ...ASCENT_INCLUDE,
  feedSeens: { where: { userId }, select: { seenAt: true } },
}) as const;

const PUBLISHED_ASCENT_FILTER = { photos: { some: {} } } as const;

export async function fetchFeedPage({
  userId,
  tenantId,
  friendUserIds,
  locale,
  beforeOwn,      // per-stream cursor: load own items older than this date
  beforeFriends,  // per-stream cursor: load friends items older than this date
  skipUnseen,     // true after first page (unseen-first only applies to initial load)
  view,           // restrict to mine / friends / with-me / person
  personId,       // for view="person" — ascents created by OR tagged with this user
  peakId,
  month,
  rarity,
  mythic,
  timeRange,
  highlightId,    // ensure this specific ascent appears in the response (one-time)
}: {
  userId: string;
  tenantId: string;
  friendUserIds: string[];
  locale: string;
  beforeOwn?: Date;
  beforeFriends?: Date;
  skipUnseen?: boolean;
  view?: View;
  personId?: string;
  peakId?: string;
  month?: string;
  rarity?: Rarity;
  mythic?: boolean;
  timeRange?: TimeRange;
  highlightId?: string;
}) {
  const db = await getTenantConnection(tenantId);
  const baseFilters = buildFilters({ peakId, month, rarity, mythic, timeRange });

  // Decide which streams to run based on view
  const runOwn = view !== "friends" && view !== "with-me";
  const runFriends = view !== "mine" && friendUserIds.length > 0;

  // view=person — add tag/creator predicate to each stream
  const personTagPredicate = personId
    ? { photos: { some: { faceDetections: { some: { faceTags: { some: { userId: personId } } } } } } }
    : null;

  // view=with-me — friend ascents where currentUser is tagged
  const withMeTagPredicate = view === "with-me"
    ? { photos: { some: { faceDetections: { some: { faceTags: { some: { userId } } } } } } }
    : null;

  // Compose where clauses using Prisma's AND array — avoids `date` key collision between
  // baseFilters (timeRange/month) and the per-stream cursor (beforeOwn/beforeFriends).
  const ownConditions: Record<string, unknown>[] = [
    { tenantId, createdBy: userId },
    PUBLISHED_ASCENT_FILTER,
    ...baseFilters,
  ];
  if (beforeOwn) ownConditions.push({ date: { lt: beforeOwn } });
  if (view === "person" && personTagPredicate) ownConditions.push(personTagPredicate);

  const friendsConditions: Record<string, unknown>[] = [
    { createdBy: { in: friendUserIds } },
    PUBLISHED_ASCENT_FILTER,
    ...baseFilters,
  ];
  if (beforeFriends) friendsConditions.push({ date: { lt: beforeFriends } });
  if (view === "with-me" && withMeTagPredicate) friendsConditions.push(withMeTagPredicate);
  if (view === "person" && personId) {
    friendsConditions.push({
      OR: [
        { createdBy: personId },
        ...(personTagPredicate ? [personTagPredicate] : []),
      ],
    });
  }

  const [myRaw, friendsRaw, highlightRaw] = await Promise.all([
    runOwn
      ? db.ascent.findMany({
          where: { AND: ownConditions },
          orderBy: { date: "desc" },
          take: PAGE_SIZE,
          include: ASCENT_INCLUDE,
        })
      : Promise.resolve([]),
    runFriends
      ? prisma.ascent.findMany({
          where: { AND: friendsConditions },
          orderBy: { date: "desc" },
          take: PAGE_SIZE,
          include: ASCENT_INCLUDE_WITH_SEEN(userId),
        })
      : Promise.resolve([]),
    // One-off highlight fetch — independent of cursor / pagination
    highlightId
      ? prisma.ascent.findFirst({
          where: {
            id: highlightId,
            ...PUBLISHED_ASCENT_FILTER,
            OR: [
              { tenantId, createdBy: userId },
              { createdBy: { in: friendUserIds } },
            ],
          },
          include: ASCENT_INCLUDE_WITH_SEEN(userId),
        })
      : Promise.resolve(null),
  ]);

  const allRaw = [...myRaw, ...friendsRaw, ...(highlightRaw ? [highlightRaw] : [])];
  const uniquePeakIds = [...new Set(allRaw.map((a) => a.peakId))];
  const peakStatsMap = await getPeakStats(uniquePeakIds);

  const myAscents = myRaw.map((a) => ({
    ...enrichAscent(a as RawAscent, true, locale),
    peakStats: peakStatsMap.get(a.peakId),
  }));

  const friendAscents = friendsRaw.map((a) => ({
    ...enrichAscent(
      a as RawAscent,
      false,
      locale,
      (a as { feedSeens?: { seenAt: Date }[] }).feedSeens ?? [],
    ),
    peakStats: peakStatsMap.get(a.peakId),
  }));

  // Highlight ascent — figure out if it's own or by friend and enrich accordingly
  let highlightAscent = null;
  if (highlightRaw) {
    const isOwn = highlightRaw.createdBy === userId;
    highlightAscent = {
      ...enrichAscent(
        highlightRaw as RawAscent,
        isOwn,
        locale,
        isOwn ? undefined : (highlightRaw as { feedSeens?: { seenAt: Date }[] }).feedSeens ?? [],
      ),
      peakStats: peakStatsMap.get(highlightRaw.peakId),
    };
  }

  // Canonical order (unseen-first) + highlight injection — pure logic in feed-merge.ts.
  const ascents = mergeFeedStreams({ myAscents, friendAscents, highlightAscent, skipUnseen });

  // Per-stream cursors for next page. A stream is "exhausted" when it returns less than PAGE_SIZE
  // (no more items older than its current cursor). Tracking them separately prevents one stream's
  // older items from causing the other stream's items to be skipped.
  const nextBeforeOwn = nextStreamCursor(myRaw, PAGE_SIZE);
  const nextBeforeFriends = nextStreamCursor(friendsRaw, PAGE_SIZE);
  const hasMore = nextBeforeOwn !== null || nextBeforeFriends !== null;

  return { ascents, hasMore, nextBeforeOwn, nextBeforeFriends };
}

export async function fetchFeedSummary({
  userId,
  tenantId,
  friendUserIds,
  view,
  personId,
  peakId,
  month,
  rarity,
  mythic,
  timeRange,
}: {
  userId: string;
  tenantId: string;
  friendUserIds: string[];
  view?: View;
  personId?: string;
  peakId?: string;
  month?: string;
  rarity?: Rarity;
  mythic?: boolean;
  timeRange?: TimeRange;
}) {
  const db = await getTenantConnection(tenantId);
  const baseFilters = buildFilters({ peakId, month, rarity, mythic, timeRange });

  const runOwn = view !== "friends" && view !== "with-me";
  const runFriends = view !== "mine" && friendUserIds.length > 0;

  const personTagPredicate = personId
    ? { photos: { some: { faceDetections: { some: { faceTags: { some: { userId: personId } } } } } } }
    : null;

  const withMeTagPredicate = view === "with-me"
    ? { photos: { some: { faceDetections: { some: { faceTags: { some: { userId } } } } } } }
    : null;

  const ownConditions: Record<string, unknown>[] = [
    { tenantId, createdBy: userId },
    PUBLISHED_ASCENT_FILTER,
    ...baseFilters,
  ];
  if (view === "person" && personTagPredicate) ownConditions.push(personTagPredicate);

  const friendsConditions: Record<string, unknown>[] = [
    { createdBy: { in: friendUserIds } },
    PUBLISHED_ASCENT_FILTER,
    ...baseFilters,
  ];
  if (view === "with-me" && withMeTagPredicate) friendsConditions.push(withMeTagPredicate);
  if (view === "person" && personId) {
    friendsConditions.push({
      OR: [
        { createdBy: personId },
        ...(personTagPredicate ? [personTagPredicate] : []),
      ],
    });
  }

  const [ownCount, ownPeaks, friendsCount, friendPeaks] = await Promise.all([
    runOwn
      ? db.ascent.count({ where: { AND: ownConditions } })
      : Promise.resolve(0),
    runOwn
      ? db.ascent.findMany({
          where: { AND: ownConditions },
          select: { peakId: true },
          distinct: ["peakId"],
        })
      : Promise.resolve([]),
    runFriends
      ? prisma.ascent.count({ where: { AND: friendsConditions } })
      : Promise.resolve(0),
    runFriends
      ? prisma.ascent.findMany({
          where: { AND: friendsConditions },
          select: { peakId: true },
          distinct: ["peakId"],
        })
      : Promise.resolve([]),
  ]);

  return {
    totalAscents: ownCount + friendsCount,
    uniquePeaks: new Set([...ownPeaks, ...friendPeaks].map((a) => a.peakId)).size,
  };
}
