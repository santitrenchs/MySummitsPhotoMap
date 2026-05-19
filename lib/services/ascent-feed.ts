import { prisma } from "@/lib/db/client";
import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { getPeakStats } from "@/lib/services/peak.service";

export const PAGE_SIZE = 5;

export const PHOTOS_INCLUDE = {
  orderBy: { createdAt: "asc" as const },
  select: {
    id: true,
    url: true,
    originalStorageKey: true,
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
    id: string; name: string; altitudeM: number; isMythic: boolean;
    mountainRange: string | null; latitude: number; longitude: number;
    wikiTexts?: { lang: string; wikiUrl: string; body: string }[];
  };
  photos: {
    id: string; url: string; originalStorageKey: string | null;
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
  const wikiTexts = a.peak.wikiTexts ?? [];
  const wikiText = wikiTexts.find(w => w.lang === locale) ?? wikiTexts.find(w => w.lang === "en") ?? wikiTexts[0] ?? null;
  return {
    id: a.id,
    date: a.date.toISOString(),
    route: a.route,
    description: a.description,
    wikiloc: a.wikiloc,
    createdByUserId: a.createdBy,
    peak: { ...a.peak, wikiTexts: undefined, wikiUrl: wikiText?.wikiUrl ?? null, wikiBody: wikiText?.body ?? null },
    firstPhotoId: firstPhoto?.id ?? null,
    firstPhotoUrl: firstPhoto?.url ?? null,
    firstPhotoOriginalKey: firstPhoto?.originalStorageKey ?? null,
    persons: Array.from(personMap.values()),
    isOwn,
    isUnseen: feedSeens ? feedSeens.length === 0 : false,
    userName: a.user?.name ?? "?",
    userAvatarUrl: a.user?.avatarUrl ?? null,
  };
}

export async function fetchFeedPage({
  userId,
  tenantId,
  friendUserIds,
  locale,
  before,        // cursor: load items older than this date
  skipUnseen,    // true after first page (unseen-first only applies to initial load)
}: {
  userId: string;
  tenantId: string;
  friendUserIds: string[];
  locale: string;
  before?: Date;
  skipUnseen?: boolean;
}) {
  const db = await getTenantConnection(tenantId);

  const dateFilter = before ? { lt: before } : undefined;

  const [myRaw, friendsRaw] = await Promise.all([
    db.ascent.findMany({
      where: { tenantId, createdBy: userId, ...(dateFilter ? { date: dateFilter } : {}) },
      orderBy: { date: "desc" },
      take: PAGE_SIZE,
      include: {
        peak: { select: { id: true, name: true, altitudeM: true, isMythic: true, mountainRange: true, latitude: true, longitude: true, wikiTexts: { select: { lang: true, wikiUrl: true, body: true } } } },
        photos: PHOTOS_INCLUDE,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    friendUserIds.length > 0
      ? prisma.ascent.findMany({
          where: { createdBy: { in: friendUserIds }, ...(dateFilter ? { date: dateFilter } : {}) },
          orderBy: { date: "desc" },
          take: PAGE_SIZE,
          include: {
            peak: { select: { id: true, name: true, altitudeM: true, isMythic: true, mountainRange: true, latitude: true, longitude: true, wikiTexts: { select: { lang: true, wikiUrl: true, body: true } } } },
            photos: PHOTOS_INCLUDE,
            user: { select: { id: true, name: true, avatarUrl: true } },
            feedSeens: { where: { userId }, select: { seenAt: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const allRaw = [...myRaw, ...friendsRaw];
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

  const hasMore = myRaw.length === PAGE_SIZE || friendsRaw.length === PAGE_SIZE;

  return { ascents, hasMore };
}
