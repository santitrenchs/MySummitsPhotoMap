import { prisma } from "@/lib/db/client";
import { aggregateUserStats } from "@/lib/services/stats-compute";

/**
 * Recomputes all cached stats for a user and upserts into user_stats.
 * Call this after any ascent CREATE, DELETE, or PATCH that changes peakId.
 * The aggregation math is pure and lives in stats-compute.ts.
 */
export async function recomputeUserStats(userId: string): Promise<void> {
  const ascents = await prisma.ascent.findMany({
    where: { createdBy: userId },
    select: {
      peakId: true,
      peak: {
        select: {
          altitudeM: true,
          isMythic: true,
          rarity: { select: { ep: true } },
        },
      },
    },
  });

  const stats = aggregateUserStats(ascents);

  await prisma.userStats.upsert({
    where:  { userId },
    create: { userId, ...stats },
    update: { ...stats },
  });
}
