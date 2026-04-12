import { prisma } from "@/lib/db/client";

export type SocialFeedItem = {
  id: string;
  date: string; // ISO string
  route: string | null;
  description: string | null;
  peak: { name: string; altitudeM: number; latitude: number; longitude: number };
  photos: { id: string; url: string }[];
  persons: { id: string; name: string }[];
  user: { id: string; name: string; username: string | null };
};

export type SocialData = {
  friendsCount: number;
  feed: SocialFeedItem[];
  myAscents: SocialFeedItem[];
};

const ASCENT_INCLUDE = {
  peak: { select: { name: true, altitudeM: true, latitude: true, longitude: true } },
  photos: {
    orderBy: { createdAt: "asc" as const },
    take: 6,
    select: {
      id: true,
      url: true,
      faceDetections: {
        select: {
          faceTags: {
            where: { status: "ACCEPTED" },
            select: { person: { select: { id: true, name: true } } },
          },
        },
      },
    },
  },
  user: { select: { id: true, name: true, username: true } },
} as const;

type RawAscent = {
  id: string;
  date: Date;
  route: string | null;
  description: string | null;
  peak: { name: string; altitudeM: number; latitude: number; longitude: number };
  photos: {
    id: string;
    url: string;
    faceDetections: {
      faceTags: { person: { id: string; name: string } }[];
    }[];
  }[];
  user: { id: string; name: string; username: string | null };
};

function toItem(a: RawAscent): SocialFeedItem {
  // Deduplicate persons across all photos
  const personMap = new Map<string, { id: string; name: string }>();
  for (const photo of a.photos) {
    for (const fd of photo.faceDetections) {
      for (const tag of fd.faceTags) {
        personMap.set(tag.person.id, tag.person);
      }
    }
  }
  return {
    id: a.id,
    date: a.date.toISOString(),
    route: a.route,
    description: a.description,
    peak: a.peak,
    photos: a.photos.map(({ id, url }) => ({ id, url })),
    persons: Array.from(personMap.values()),
    user: a.user,
  };
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
  const myAscents = (myAscentRows as unknown as RawAscent[]).map(toItem);

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

  return { friendsCount, feed: (feedRows as unknown as RawAscent[]).map(toItem), myAscents };
}
