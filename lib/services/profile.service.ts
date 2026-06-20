import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { prisma } from "@/lib/db/client";
import { getRarityId, type RarityId } from "@/lib/rarity";

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
        peak: {
          select: {
            id: true, name: true, altitudeM: true,
            mountainRange: true, country: true, rarityId: true, isMythic: true,
          },
        },
        photos: { orderBy: { createdAt: "asc" }, select: { id: true, url: true } },
      },
    }),
    prisma.faceTag.findMany({
      where: { userId, status: "ACCEPTED" },
      select: {
        faceDetection: {
          select: {
            photo: {
              select: {
                id: true, url: true, ascentId: true,
                ascent: {
                  select: {
                    id: true, date: true, createdBy: true,
                    peak: { select: { name: true, altitudeM: true, rarityId: true } },
                    user: { select: { name: true, username: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  // Aggregate peaks: count, firstDate, lastDate, firstPhotoUrl, rarityId, country
  const peakMap = new Map<string, {
    id: string; name: string; altitudeM: number;
    mountainRange: string | null; country: string | null;
    rarityId: RarityId; isMythic: boolean;
    count: number;
    firstDate: Date; lastDate: Date;
    firstPhotoUrl: string | null;
  }>();

  // Process ascents newest-first (already ordered desc by date)
  for (const a of ascents) {
    const pk = a.peak;
    const rarityId = (pk.rarityId as RarityId | null) ?? getRarityId(pk.altitudeM);
    if (!peakMap.has(pk.id)) {
      peakMap.set(pk.id, {
        id: pk.id, name: pk.name, altitudeM: pk.altitudeM,
        mountainRange: pk.mountainRange, country: pk.country ?? null,
        rarityId, isMythic: pk.isMythic ?? false,
        count: 0,
        firstDate: a.date, lastDate: a.date,
        firstPhotoUrl: a.photos[0]?.url ?? null,
      });
    }
    const entry = peakMap.get(pk.id)!;
    entry.count++;
    // track date range
    if (a.date < entry.firstDate) entry.firstDate = a.date;
    if (a.date > entry.lastDate) {
      entry.lastDate = a.date;
      // most-recent ascent's first photo is the hero
      entry.firstPhotoUrl = a.photos[0]?.url ?? null;
    }
  }
  const peaks = Array.from(peakMap.values()).sort((a, b) => b.altitudeM - a.altitudeM);

  // Flat photos list for the grid (oldest→newest within each ascent, ascents newest→oldest)
  const allPhotos = ascents.flatMap((a) => {
    const rarityId = (a.peak.rarityId as RarityId | null) ?? getRarityId(a.peak.altitudeM);
    return a.photos.map((p) => ({
      id: p.id, url: p.url, ascentId: a.id,
      peakName: a.peak.name, altitudeM: a.peak.altitudeM,
      rarityId,
      date: a.date,
    }));
  });

  // Flatten tagged photos, deduplicate by photoId, exclude own ascents
  const taggedPhotosMap = new Map<string, {
    id: string; url: string; ascentId: string;
    peakName: string; altitudeM: number;
    rarityId: RarityId;
    date: Date; creatorName: string;
  }>();
  for (const tag of taggedPersons) {
    const photo = tag.faceDetection.photo;
    if (!photo?.ascent) continue;
    if (photo.ascent.createdBy === userId) continue;
    if (!taggedPhotosMap.has(photo.id)) {
      const rarityId = (photo.ascent.peak.rarityId as RarityId | null) ?? getRarityId(photo.ascent.peak.altitudeM);
      taggedPhotosMap.set(photo.id, {
        id: photo.id, url: photo.url, ascentId: photo.ascentId,
        peakName: photo.ascent.peak.name, altitudeM: photo.ascent.peak.altitudeM,
        rarityId,
        date: photo.ascent.date,
        creatorName: photo.ascent.user?.username ?? photo.ascent.user?.name ?? "",
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
      maxAltitudeM: peaks.length > 0 ? peaks[0].altitudeM : 0,
      rarityBreakdown: Object.fromEntries(
        Array.from(peakMap.values()).reduce((acc, pk) => {
          acc.set(pk.rarityId, (acc.get(pk.rarityId) ?? 0) + 1);
          return acc;
        }, new Map<string, number>())
      ) as Record<string, number>,
    },
  };
}
