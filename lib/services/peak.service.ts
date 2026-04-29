import { prisma } from "@/lib/db/client";

export type PeakStats = { totalAscents: number; uniqueClimbers: number };

// Returns a map of peakId → stats, queried globally across all tenants.
export async function getPeakStats(peakIds: string[]): Promise<Map<string, PeakStats>> {
  if (peakIds.length === 0) return new Map();

  const [countGroups, distinctRows] = await Promise.all([
    prisma.ascent.groupBy({
      by: ["peakId"],
      where: { peakId: { in: peakIds } },
      _count: { id: true },
    }),
    prisma.ascent.findMany({
      where: { peakId: { in: peakIds } },
      distinct: ["peakId", "createdBy"],
      select: { peakId: true },
    }),
  ]);

  const climberMap = new Map<string, number>();
  for (const row of distinctRows) {
    climberMap.set(row.peakId, (climberMap.get(row.peakId) ?? 0) + 1);
  }

  const result = new Map<string, PeakStats>();
  for (const g of countGroups) {
    result.set(g.peakId, {
      totalAscents: g._count.id,
      uniqueClimbers: climberMap.get(g.peakId) ?? 1,
    });
  }
  return result;
}
