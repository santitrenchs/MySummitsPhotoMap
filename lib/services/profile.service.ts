import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { prisma } from "@/lib/db/client";

export async function getProfileData(tenantId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, bio: true, avatarUrl: true },
  });

  const db = await getTenantConnection(tenantId);
  const ascents = await db.ascent.findMany({
    where: { tenantId, createdBy: userId },
    orderBy: { date: "desc" },
    include: {
      peak: { select: { id: true, name: true, altitudeM: true, mountainRange: true } },
      photos: {
        orderBy: { createdAt: "asc" },
        select: { id: true, url: true },
      },
    },
  });

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
    stats: {
      totalAscents: ascents.length,
      uniquePeaks: peakMap.size,
      totalPhotos: allPhotos.length,
    },
  };
}
