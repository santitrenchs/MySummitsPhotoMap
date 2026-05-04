import { prisma } from "@/lib/db/client";

const PAGE_SIZE = 20;

export type FeedItem = {
  id: string;
  date: string;
  route: string | null;
  description: string | null;
  peak: {
    id: string;
    name: string;
    altitudeM: number;
    mountainRange: string | null;
    latitude: number;
    longitude: number;
    isMythic: boolean;
  };
  photoUrl: string | null;
  photoId: string | null;
  user: { name: string; avatarUrl: string | null };
  persons: { id: string; name: string }[];
};

async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  return friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );
}

const ascentInclude = {
  peak: {
    select: {
      id: true,
      name: true,
      altitudeM: true,
      mountainRange: true,
      latitude: true,
      longitude: true,
      isMythic: true,
    },
  },
  photos: {
    take: 1,
    orderBy: { createdAt: "asc" as const },
    select: { id: true, url: true },
  },
  user: { select: { name: true, avatarUrl: true } },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatItem(a: any): FeedItem {
  return {
    id: a.id,
    date: a.date.toISOString(),
    route: a.route ?? null,
    description: a.description ?? null,
    peak: {
      id: a.peak.id,
      name: a.peak.name,
      altitudeM: a.peak.altitudeM,
      mountainRange: a.peak.mountainRange ?? null,
      latitude: a.peak.latitude,
      longitude: a.peak.longitude,
      isMythic: a.peak.isMythic ?? false,
    },
    photoUrl: a.photos[0]?.url ?? null,
    photoId: a.photos[0]?.id ?? null,
    user: { name: a.user.name, avatarUrl: a.user.avatarUrl ?? null },
    persons: [],
  };
}

export async function getFeed(
  userId: string,
  cursor?: string
): Promise<{ unseen: FeedItem[]; seen: FeedItem[]; seenCursor: string | null }> {
  const friendIds = await getFriendIds(userId);
  if (!friendIds.length) return { unseen: [], seen: [], seenCursor: null };

  if (cursor) {
    const seenRaw = await prisma.ascent.findMany({
      where: {
        createdBy: { in: friendIds },
        feedSeens: { some: { userId } },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      cursor: { id: cursor },
      skip: 1,
      take: PAGE_SIZE + 1,
      include: ascentInclude,
    });

    const hasMore = seenRaw.length > PAGE_SIZE;
    const items = hasMore ? seenRaw.slice(0, PAGE_SIZE) : seenRaw;
    return {
      unseen: [],
      seen: items.map(formatItem),
      seenCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  const [unseenRaw, seenRaw] = await Promise.all([
    prisma.ascent.findMany({
      where: {
        createdBy: { in: friendIds },
        feedSeens: { none: { userId } },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 50,
      include: ascentInclude,
    }),
    prisma.ascent.findMany({
      where: {
        createdBy: { in: friendIds },
        feedSeens: { some: { userId } },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      include: ascentInclude,
    }),
  ]);

  const hasMore = seenRaw.length > PAGE_SIZE;
  const seenItems = hasMore ? seenRaw.slice(0, PAGE_SIZE) : seenRaw;
  return {
    unseen: unseenRaw.map(formatItem),
    seen: seenItems.map(formatItem),
    seenCursor: hasMore ? seenItems[seenItems.length - 1].id : null,
  };
}

export async function markSeen(userId: string, ascentIds: string[]): Promise<void> {
  if (!ascentIds.length) return;
  await prisma.feedSeen.createMany({
    data: ascentIds.map((ascentId) => ({ userId, ascentId })),
    skipDuplicates: true,
  });
}

export async function countUnseenFeed(userId: string): Promise<number> {
  const friendIds = await getFriendIds(userId);
  if (!friendIds.length) return 0;
  return prisma.ascent.count({
    where: {
      createdBy: { in: friendIds },
      feedSeens: { none: { userId } },
    },
  });
}
