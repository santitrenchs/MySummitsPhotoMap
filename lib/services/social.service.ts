import { prisma } from "@/lib/db/client";

export type SocialFeedItem = {
  id: string;
  date: string; // ISO string
  route: string | null;
  tenantId: string;
  peak: { name: string; altitudeM: number };
  photos: { id: string; url: string }[];
  user: { id: string; name: string; username: string | null }; // ascent creator
  taggedFriends: { name: string; userId: string }[]; // friends tagged in photos (deduped)
};

export async function getSocialFeed(userId: string): Promise<SocialFeedItem[]> {
  // Get all accepted friend user IDs
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  if (friendships.length === 0) return [];

  const friendUserIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );

  // Ascents created by friends OR where friends are tagged in photos
  const ascents = await prisma.ascent.findMany({
    where: {
      OR: [
        { createdBy: { in: friendUserIds } },
        {
          photos: {
            some: {
              faceDetections: {
                some: {
                  faceTags: {
                    some: {
                      status: "ACCEPTED",
                      person: { userId: { in: friendUserIds } },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
    orderBy: { date: "desc" },
    take: 60,
    include: {
      peak: { select: { name: true, altitudeM: true } },
      photos: {
        orderBy: { createdAt: "asc" },
        take: 6,
        select: { id: true, url: true },
      },
      user: { select: { id: true, name: true, username: true } },
    },
  });

  if (ascents.length === 0) return [];

  // For each ascent, find which friend-linked persons are tagged
  const ascentIds = ascents.map((a) => a.id);
  const taggedRows = await prisma.faceTag.findMany({
    where: {
      status: "ACCEPTED",
      person: { userId: { in: friendUserIds } },
      faceDetection: { photo: { ascentId: { in: ascentIds } } },
    },
    select: {
      person: { select: { name: true, userId: true } },
      faceDetection: { select: { photo: { select: { ascentId: true } } } },
    },
  });

  // Build ascentId → tagged friends map (deduped by userId)
  const taggedByAscent = new Map<string, { name: string; userId: string }[]>();
  for (const row of taggedRows) {
    const ascentId = row.faceDetection.photo.ascentId;
    const uid = row.person.userId!;
    if (!taggedByAscent.has(ascentId)) taggedByAscent.set(ascentId, []);
    const list = taggedByAscent.get(ascentId)!;
    if (!list.find((f) => f.userId === uid)) {
      list.push({ name: row.person.name, userId: uid });
    }
  }

  return ascents.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    route: a.route,
    tenantId: a.tenantId,
    peak: a.peak,
    photos: a.photos,
    user: a.user,
    taggedFriends: taggedByAscent.get(a.id) ?? [],
  }));
}
