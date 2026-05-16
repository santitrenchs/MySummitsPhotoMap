import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/client";
import { RARITIES } from "@/lib/rarity";

export type LandingStats = {
  stats: { totalRarities: number; totalPeaks: number; capturedPeaks: number; totalAscents: number };
  peakCounts: Record<string, number>;
};

/**
 * Fetches landing page statistics, cached at the function level for 1 hour.
 *
 * Using unstable_cache + force-dynamic on the landing pages (instead of ISR)
 * means Next.js never tries to pre-render these pages at build time — so the
 * Railway build succeeds without needing a DB connection. The cache is
 * populated on the first real request and revalidated every 3600 s.
 */
export const getLandingStats = unstable_cache(
  async (): Promise<LandingStats> => {
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
  },
  ["landing-stats"],
  { revalidate: 3600 }
);
