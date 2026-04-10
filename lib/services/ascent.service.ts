import { getTenantConnection } from "@/lib/db/tenant-resolver";

export type CreateAscentInput = {
  peakId: string;
  date: string; // ISO date string "YYYY-MM-DD"
  route?: string;
  description?: string;
  createdBy: string;
};

export async function listAscents(tenantId: string) {
  const db = await getTenantConnection(tenantId);
  return db.ascent.findMany({
    where: { tenantId },
    orderBy: { date: "desc" },
    include: {
      peak: {
        select: { id: true, name: true, altitudeM: true, mountainRange: true },
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
                  person: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
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

export async function deleteAscent(tenantId: string, ascentId: string) {
  const db = await getTenantConnection(tenantId);
  // Verify ownership before deleting
  const existing = await db.ascent.findFirst({
    where: { id: ascentId, tenantId },
  });
  if (!existing) return null;
  return db.ascent.delete({ where: { id: ascentId } });
}
