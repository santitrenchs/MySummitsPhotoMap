import { prisma } from "@/lib/db/client";

export type SocialFeedItem = {
  id: string;
  date: string; // ISO string
  route: string | null;
  peak: { name: string; altitudeM: number };
  photos: { id: string; url: string }[];
  user: { id: string; name: string; username: string | null };
};

export type SocialData = {
  friendsCount: number;
  feed: SocialFeedItem[];
  myAscents: SocialFeedItem[];
};

const ASCENT_INCLUDE = {
  peak: { select: { name: true, altitudeM: true } },
  photos: { orderBy: { createdAt: "asc" as const }, take: 6, select: { id: true, url: true } },
  user: { select: { id: true, name: true, username: true } },
} as const;

function toItem(a: {
  id: string; date: Date; route: string | null;
  peak: { name: string; altitudeM: number };
  photos: { id: string; url: string }[];
  user: { id: string; name: string; username: string | null };
}): SocialFeedItem {
  return { ...a, date: a.date.toISOString() };
}

export async function getSocialData(userId: string): Promise<SocialData> {
  const [friendships, myAscentRows] = await Promise.all([
    prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    }),
    prisma.ascent.findMany({
      where: { createdBy: userId },
      orderBy: { date: "desc" },
      take: 20,
      include: ASCENT_INCLUDE,
    }),
  ]);

  const friendsCount = friendships.length;
  const myAscents = myAscentRows.map(toItem);

  if (friendsCount === 0) {
    return { friendsCount: 0, feed: [], myAscents };
  }

  const friendUserIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );

  const feedRows = await prisma.ascent.findMany({
    where: { createdBy: { in: friendUserIds } },
    orderBy: { date: "desc" },
    take: 60,
    include: ASCENT_INCLUDE,
  });

  return { friendsCount, feed: feedRows.map(toItem), myAscents };
}
