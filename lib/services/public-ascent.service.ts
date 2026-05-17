import { prisma } from "@/lib/db/client";

export type PublicAscentData = {
  id: string;
  date: string;
  route: string | null;
  description: string | null;
  peak: {
    name: string;
    altitudeM: number;
    mountainRange: string | null;
    isMythic: boolean;
    rarityId: string | null;
    latitude: number;
    longitude: number;
  };
  photoUrl: string | null;
  user: { name: string; avatarUrl: string | null };
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
          name: true,
          altitudeM: true,
          mountainRange: true,
          isMythic: true,
          rarityId: true,
          latitude: true,
          longitude: true,
        },
      },
      photos: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { url: true },
      },
      user: {
        select: { name: true, avatarUrl: true },
      },
    },
  });

  if (!ascent || !ascent.isPublic) return null;

  return {
    id: ascent.id,
    date: ascent.date.toISOString(),
    route: ascent.route,
    description: ascent.description,
    peak: ascent.peak,
    photoUrl: ascent.photos[0]?.url ?? null,
    user: ascent.user,
  };
}
