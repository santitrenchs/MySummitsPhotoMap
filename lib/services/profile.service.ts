import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { prisma } from "@/lib/db/client";

export async function getProfileData(tenantId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, bio: true, avatarUrl: true },
  });

  const friendCount = await prisma.friendship.count({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });

  const db = await getTenantConnection(tenantId);
  const [ascents, taggedPersons] = await Promise.all([
    db.ascent.findMany({
      where: { tenantId, createdBy: userId },
      orderBy: { date: "desc" },
      include: {
        peak: { select: { id: true, name: true, altitudeM: true, mountainRange: true } },
        photos: { orderBy: { createdAt: "asc" }, select: { id: true, url: true } },
      },
    }),
    // Photos where this user is tagged by others
    db.faceTag.findMany({
      where: { tenantId, userId, status: "ACCEPTED" },
      select: {
        faceDetection: {
          select: {
            photo: {
              select: {
                id: true, url: true, ascentId: true,
                ascent: {
                  select: {
                    id: true, date: true, createdBy: true,
                    peak: { select: { name: true, altitudeM: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  // Aggregate peaks with climb count, sorted by altitude desc
  const peakMap = new Map<string, {
    id: string; name: string; altitudeM: number;
    mountainRange: string | null; count: number;
  }>();
  for (const a of ascents) {
    const pk = a.peak;
    if (!peakMap.has(pk.id)) {
      peakMap.set(pk.id, { id: pk.id, name: pk.name, altitudeM: pk.altitudeM, mountainRange: pk.mountainRange, count: 0 });
    }
    peakMap.get(pk.id)!.count++;
  }
  const peaks = Array.from(peakMap.values()).sort((a, b) => b.altitudeM - a.altitudeM);

  // Flat photos list for the grid (oldest→newest within each ascent, ascents newest→oldest)
  const allPhotos = ascents.flatMap((a) =>
    a.photos.map((p) => ({
      id: p.id, url: p.url, ascentId: a.id,
      peakName: a.peak.name, altitudeM: a.peak.altitudeM, date: a.date,
    }))
  );

  // Flatten tagged photos, deduplicate by photoId, exclude own ascents
  const taggedPhotosMap = new Map<string, {
    id: string; url: string; ascentId: string;
    peakName: string; altitudeM: number; date: Date;
  }>();
  for (const tag of taggedPersons) {
    const photo = tag.faceDetection.photo;
    if (!photo?.ascent) continue;
    if (photo.ascent.createdBy === userId) continue;
    if (!taggedPhotosMap.has(photo.id)) {
      taggedPhotosMap.set(photo.id, {
        id: photo.id, url: photo.url, ascentId: photo.ascentId,
        peakName: photo.ascent.peak.name, altitudeM: photo.ascent.peak.altitudeM,
        date: photo.ascent.date,
      });
    }
  }
  const taggedPhotos = Array.from(taggedPhotosMap.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    user,
    ascents: ascents.map((a) => ({
      id: a.id,
      date: a.date,
      peakName: a.peak.name,
      altitudeM: a.peak.altitudeM,
      mountainRange: a.peak.mountainRange,
      firstPhoto: a.photos[0] ?? null,
      photoCount: a.photos.length,
    })),
    peaks,
    allPhotos,
    taggedPhotos,
    stats: {
      totalAscents: ascents.length,
      uniquePeaks: peakMap.size,
      totalPhotos: allPhotos.length,
      friendCount,
    },
  };
}
