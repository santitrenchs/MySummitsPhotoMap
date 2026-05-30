import { prisma } from "@/lib/db/client";
import { LEVEL_DEFS, meetsLevel } from "@/lib/level-utils";
import type { HomeData } from "@/lib/services/home.service";

/**
 * Builds the minimal AltStats shape that meetsLevel() needs, from a raw
 * array of unique-peak altitudes. Single source of truth — never duplicate
 * these threshold numbers anywhere else.
 */
function altStatsFromAlts(alts: number[]): HomeData["stats"] {
  const count = (min: number) => alts.filter((m) => m >= min).length;
  return {
    peaks1000plus: count(1000),
    peaks1500plus: count(1500),
    peaks2000plus: count(2000),
    peaks3000plus: count(3000),
    peaks4000plus: count(4000),
    peaks4500plus: count(4500),
    peaks5000plus: count(5000),
    peaks6000plus: count(6000),
    peaks6500plus: count(6500),
    peaks8000plus: count(8000),
  } as HomeData["stats"];
}

/**
 * Returns the number of completed levels (0 = none, 1 = first level done, …).
 * Uses LEVEL_DEFS from level-utils.ts as the single source of truth.
 */
function computeLevelIdx(uniquePeaks: number, uniqueAlts: number[]): number {
  const altStats = altStatsFromAlts(uniqueAlts);
  let idx = 0;
  for (const def of LEVEL_DEFS) {
    if (meetsLevel(def, uniquePeaks, altStats)) idx = def.idx;
    else break;
  }
  return idx;
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
