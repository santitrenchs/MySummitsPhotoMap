import { prisma } from "@/lib/db/client";
import { RARITIES } from "@/lib/rarity";

export type LandingStats = {
  stats: { totalRarities: number; totalPeaks: number; capturedPeaks: number; totalAscents: number };
  peakCounts: Record<string, number>;
};

/**
 * Fetches landing page statistics from the DB.
 *
 * The try/catch is intentional: during Railway's build phase the internal
 * Postgres URL (`postgres-*.railway.internal`) is not reachable. Returning
 * zeros lets Next.js complete the ISR pre-render without a real DB connection;
 * the page is revalidated with live data on the first real request.
 */
export async function getLandingStats(): Promise<LandingStats> {
  const emptyPeakCounts = Object.fromEntries(RARITIES.map((r) => [r.id, 0])) as Record<string, number>;

  try {
    const [totalPeaks, capturedPeaks, totalAscents, ...rarityCounts] = await Promise.all([
      prisma.peak.count(),
      prisma.ascent.groupBy({ by: ["peakId"] }).then((r) => r.length),
      prisma.ascent.count(),
      ...RARITIES.map((r, i) => {
        const next = RARITIES[i + 1];
        return prisma.peak.count({
          where: { altitudeM: { gte: r.minAlt, ...(next ? { lt: next.minAlt } : {}) } },
        });
      }),
    ]);

    const peakCounts = Object.fromEntries(
      RARITIES.map((r, i) => [r.id, rarityCounts[i]])
    ) as Record<string, number>;

    return {
      stats: { totalRarities: 9, totalPeaks, capturedPeaks, totalAscents },
      peakCounts,
    };
  } catch {
    // DB is not reachable at build time (Railway internal network).
    // ISR will rehydrate with real data on the first incoming request.
    return {
      stats: { totalRarities: 9, totalPeaks: 0, capturedPeaks: 0, totalAscents: 0 },
      peakCounts: emptyPeakCounts,
    };
  }
}
