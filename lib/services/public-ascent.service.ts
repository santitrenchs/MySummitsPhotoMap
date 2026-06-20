import { prisma } from "@/lib/db/client";
import { getPeakStats } from "@/lib/services/peak.service";

export type PublicAscentData = {
  id: string;
  date: string;
  route: string | null;
  description: string | null;
  peak: {
    id: string;
    name: string;
    nameEn: string | null;
    altitudeM: number;
    mountainRange: string | null;
    isMythic: boolean;
    rarityId: string | null;
    latitude: number;
    longitude: number;
    elevationProfile: unknown | null;
  };
  photoUrl: string | null;
  photoCropAspect: string | null;
  user: { name: string; avatarUrl: string | null };
  /** Tagged users on the hero photo (deduped) — for the back-face Cordada. */
  persons: { id: string; name: string }[];
  peakStats: { totalAscents: number; uniqueClimbers: number } | null;
};

export async function getPublicAscent(id: string): Promise<PublicAscentData | null> {
  const ascent = await prisma.ascent.findUnique({
    where: { id },
    select: {
      id: true,
      isPublic: true,
      date: true,
      route: true,
      description: true,
      peak: {
        select: {
          id: true,
          name: true,
          nameEn: true,
          altitudeM: true,
          mountainRange: true,
          isMythic: true,
          rarityId: true,
          latitude: true,
          longitude: true,
          elevationProfile: true,
        },
      },
      photos: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          url: true,
          cropAspect: true,
          faceDetections: {
            select: {
              faceTags: {
                select: { userId: true, user: { select: { id: true, name: true, username: true } } },
              },
            },
          },
        },
      },
      user: {
        select: { name: true, avatarUrl: true },
      },
    },
  });

  if (!ascent || !ascent.isPublic) return null;

  const heroPhoto = ascent.photos[0] ?? null;
  const personMap = new Map<string, { id: string; name: string }>();
  if (heroPhoto) {
    for (const fd of heroPhoto.faceDetections) {
      for (const tag of fd.faceTags) {
        if (tag.userId && tag.user) {
          personMap.set(tag.userId, { id: tag.userId, name: tag.user.username ?? tag.user.name });
        }
      }
    }
  }

  const peakStats = (await getPeakStats([ascent.peak.id])).get(ascent.peak.id) ?? null;

  return {
    id: ascent.id,
    date: ascent.date.toISOString(),
    route: ascent.route,
    description: ascent.description,
    peak: ascent.peak,
    photoUrl: heroPhoto?.url ?? null,
    photoCropAspect: heroPhoto?.cropAspect ?? null,
    user: ascent.user,
    persons: Array.from(personMap.values()),
    peakStats,
  };
}
