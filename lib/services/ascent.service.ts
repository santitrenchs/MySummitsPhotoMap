import { getTenantConnection } from "@/lib/db/tenant-resolver";

export type CreateAscentInput = {
  peakId: string;
  date: string; // ISO date string "YYYY-MM-DD"
  route?: string;
  description?: string;
  createdBy: string;
};

export async function listAscents(tenantId: string, userId: string, friendUserIds: string[]) {
  const db = await getTenantConnection(tenantId);
  const ascents = await db.ascent.findMany({
    where: {
      tenantId,
      createdBy: { in: [userId, ...friendUserIds] },
    },
    orderBy: { date: "desc" },
    include: {
      peak: {
        select: { id: true, name: true, altitudeM: true, mountainRange: true, latitude: true, longitude: true, isMythic: true },
      },
      photos: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          url: true,
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
      },
      user: {
        select: { name: true, avatarUrl: true },
      },
    },
  });

  return ascents.map((a) => {
    const personMap = new Map<string, { id: string; name: string }>();
    for (const photo of a.photos) {
      for (const fd of photo.faceDetections) {
        for (const tag of fd.faceTags) {
          if (tag.userId && tag.user) {
            personMap.set(tag.userId, { id: tag.userId, name: tag.user.username ?? tag.user.name });
          }
        }
      }
    }
    return {
      id: a.id,
      peakId: a.peakId,
      peak: a.peak,
      createdBy: a.createdBy,
      user: a.user ? { id: a.createdBy, name: a.user.name ?? "?", username: null as string | null, avatarUrl: a.user.avatarUrl ?? null } : null,
      isOwn: a.createdBy === userId,
      date: a.date.toISOString(),
      route: a.route,
      description: a.description,
      wikiloc: a.wikiloc,
      photos: a.photos.map((p) => ({ id: p.id, url: p.url })),
      persons: Array.from(personMap.values()),
      createdAt: a.createdAt.toISOString(),
    };
  });
}

export async function getAscentedPeakIds(tenantId: string): Promise<string[]> {
  const db = await getTenantConnection(tenantId);
  const rows = await db.ascent.findMany({
    where: { tenantId },
    select: { peakId: true },
    distinct: ["peakId"],
  });
  return rows.map((r) => r.peakId);
}

export async function getAscentMapData(tenantId: string) {
  const db = await getTenantConnection(tenantId);
  const rows = await db.ascent.findMany({
    where: { tenantId },
    orderBy: { date: "desc" }, // newest first → deduplicate keeps most recent per peak
    select: {
      id: true,
      peakId: true,
      date: true,
      route: true,
      photos: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          url: true,
          faceDetections: { select: { boundingBox: true } },
        },
      },
    },
  });
  // Group by peakId — rows already sorted date desc, so index 0 = most recent per peak
  const byPeak = new Map<string, typeof rows[number][]>();
  for (const r of rows) {
    if (!byPeak.has(r.peakId)) byPeak.set(r.peakId, []);
    byPeak.get(r.peakId)!.push(r);
  }

  return Array.from(byPeak.entries()).map(([peakId, ascents]) => {
    const mostRecent = ascents[0];
    // Use photo from the most recent ascent that has one — not necessarily the most recent ascent.
    // This prevents a new text-only ascent from hiding a photo from an older ascent of the same peak.
    const withPhoto = ascents.find(a => a.photos.length > 0);
    const photo = withPhoto?.photos[0] ?? null;
    let faceCenterX: number | null = null;
    let faceCenterY: number | null = null;
    try {
      if (photo && photo.faceDetections.length > 0) {
        const boxes = photo.faceDetections.map(
          (fd) => fd.boundingBox as { x: number; y: number; width: number; height: number }
        );
        faceCenterX = boxes.reduce((sum, b) => sum + b.x + b.width / 2, 0) / boxes.length;
        faceCenterY = boxes.reduce((sum, b) => sum + b.y + b.height / 2, 0) / boxes.length;
      }
    } catch { /* non-critical */ }
    return {
      peakId,
      ascentId: mostRecent.id,
      photoUrl: photo?.url ?? null,
      date: mostRecent.date.toISOString(),
      route: mostRecent.route,
      ascentCount: ascents.length,
      faceCenterX,
      faceCenterY,
    };
  });
}

export async function createAscent(
  tenantId: string,
  input: CreateAscentInput
) {
  const db = await getTenantConnection(tenantId);
  return db.ascent.create({
    data: {
      tenantId,
      peakId: input.peakId,
      date: new Date(input.date),
      route: input.route ?? null,
      description: input.description ?? null,
      createdBy: input.createdBy,
    },
    include: {
      peak: { select: { id: true, name: true, altitudeM: true } },
    },
  });
}

export async function deleteAscent(tenantId: string, ascentId: string, userId: string) {
  const db = await getTenantConnection(tenantId);
  const existing = await db.ascent.findFirst({
    where: { id: ascentId, tenantId, createdBy: userId },
  });
  if (!existing) return null;
  return db.ascent.delete({ where: { id: ascentId } });
}
