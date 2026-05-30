import { prisma } from "@/lib/db/client";

// Level thresholds — mirrors LEVEL_DEFS in HomeScreen.kt and computeLevelIdx in home.service.ts
function computeLevelIdx(uniquePeaks: number, uniqueAlts: number[]): number {
  const u2000 = uniqueAlts.filter((m) => m >= 2000).length;
  const u3000 = uniqueAlts.filter((m) => m >= 3000).length;
  const u4000 = uniqueAlts.filter((m) => m >= 4000).length;
  const u5000 = uniqueAlts.filter((m) => m >= 5000).length;
  const u6500 = uniqueAlts.filter((m) => m >= 6500).length;
  const u8000 = uniqueAlts.filter((m) => m >= 8000).length;

  if (uniquePeaks >= 300 && u8000 >= 1) return 6;
  if (uniquePeaks >= 220 && u6500 >= 1) return 5;
  if (uniquePeaks >= 150 && u5000 >= 1) return 4;
  if (uniquePeaks >= 100 && u4000 >= 1) return 3;
  if (uniquePeaks >= 50  && u3000 >= 1) return 2;
  if (uniquePeaks >= 20  && u2000 >= 1) return 1;
  return 0;
}

/**
 * Recomputes all cached stats for a user and upserts into user_stats.
 * Call this after any ascent CREATE, DELETE, or PATCH that changes peakId.
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

  const seenPeaks = new Map<string, number>(); // peakId → altitudeM
  let totalEp = 0;
  let totalCairns = 0;

  for (const a of ascents) {
    if (!seenPeaks.has(a.peakId)) seenPeaks.set(a.peakId, a.peak.altitudeM);
    totalEp += a.peak.rarity?.ep ?? 1;
    if (a.peak.isMythic) totalCairns++;
  }

  const uniqueAlts = [...seenPeaks.values()];
  const totalAscents = ascents.length;
  const uniquePeaks  = seenPeaks.size;
  const maxAltitudeM = uniqueAlts.length > 0 ? Math.max(...uniqueAlts) : 0;
  const levelIdx     = computeLevelIdx(uniquePeaks, uniqueAlts);

  await prisma.userStats.upsert({
    where:  { userId },
    create: { userId, totalAscents, uniquePeaks, maxAltitudeM, totalEp, totalCairns, levelIdx },
    update: {         totalAscents, uniquePeaks, maxAltitudeM, totalEp, totalCairns, levelIdx },
  });
}
