import { prisma } from "@/lib/db/client";
import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { getPeakStats } from "@/lib/services/peak.service";

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

export type View = "mine" | "friends" | "with-me" | "person";
export type Rarity = "daisy" | "gentian" | "edelweiss" | "saxifrage" | "cinquefoil" | "snow_lotus";
export type TimeRange = "all" | "month" | "year";

function rarityRange(r: Rarity): { min: number; max: number | null } {
  switch (r) {
    case "daisy": return { min: 0, max: 1500 };
    case "gentian": return { min: 1500, max: 3000 };
    case "edelweiss": return { min: 3000, max: 5000 };
    case "saxifrage": return { min: 5000, max: 7000 };
    case "cinquefoil": return { min: 7000, max: 8000 };
    case "snow_lotus": return { min: 8000, max: null };
  }
}

// Build the "filter" portion of a WHERE clause — applied to both own and friends queries.
// Excludes the stream selector (createdBy / tenantId) and the cursor (date.lt), which are
// stream-specific.
function buildFilters(opts: {
  peakId?: string;
  month?: string;
  rarity?: Rarity;
  mythic?: boolean;
  timeRange?: TimeRange;
}) {
  const conditions: Record<string, unknown>[] = [];
  if (opts.peakId) conditions.push({ peakId: opts.peakId });

  // Date range — explicit month wins over timeRange shortcut
  if (opts.month) {
    const [y, m] = opts.month.split("-").map((s) => parseInt(s, 10));
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    conditions.push({ date: { gte: start, lt: end } });
  } else if (opts.timeRange === "month") {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    conditions.push({ date: { gte: cutoff } });
  } else if (opts.timeRange === "year") {
    const yr = new Date().getFullYear();
    conditions.push({ date: { gte: new Date(Date.UTC(yr, 0, 1)), lt: new Date(Date.UTC(yr + 1, 0, 1)) } });
  }

  if (opts.mythic) {
    conditions.push({ peak: { isMythic: true } });
  } else if (opts.rarity) {
    const { min, max } = rarityRange(opts.rarity);
    conditions.push({ peak: { altitudeM: max !== null ? { gte: min, lt: max } : { gte: min } } });
  }

  return conditions;
}

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

  const byDate = (a: { date: string }, b: { date: string }) =>
    new Date(b.date).getTime() - new Date(a.date).getTime();

  let ascents;
  if (!skipUnseen) {
    const unseenFriends = friendAscents.filter((a) => a.isUnseen).sort(byDate);
    const rest = [...myAscents, ...friendAscents.filter((a) => !a.isUnseen)].sort(byDate);
    ascents = [...unseenFriends, ...rest];
  } else {
    ascents = [...myAscents, ...friendAscents].sort(byDate);
  }

  // Inject highlight ascent if not already present
  if (highlightAscent && !ascents.find((a) => a.id === highlightAscent!.id)) {
    ascents = [...ascents, highlightAscent].sort(byDate);
  }

  // Per-stream cursors for next page. A stream is "exhausted" when it returns less than PAGE_SIZE
  // (no more items older than its current cursor). Tracking them separately prevents one stream's
  // older items from causing the other stream's items to be skipped.
  const nextBeforeOwn =
    myRaw.length === PAGE_SIZE ? myRaw[myRaw.length - 1].date.toISOString() : null;
  const nextBeforeFriends =
    friendsRaw.length === PAGE_SIZE ? friendsRaw[friendsRaw.length - 1].date.toISOString() : null;
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
