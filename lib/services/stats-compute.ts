// ─── Pure user-stats aggregation ──────────────────────────────────────────────
//
// The math behind the user_stats table (leaderboard, levels, EP, cairns).
// No DB imports — unit-testable (see __tests__/stats-compute.test.ts).
// The Prisma query + upsert live in stats.service.ts.

import { LEVEL_DEFS, meetsLevel } from "@/lib/level-utils";
import type { HomeData } from "@/lib/services/home.service";

/** The minimal ascent shape needed to aggregate stats (matches the Prisma select in stats.service). */
export type AscentForStats = {
  peakId: string;
  peak: {
    altitudeM: number;
    isMythic: boolean;
    rarity: { ep: number | null } | null;
  };
};

export type UserStatsAggregate = {
  totalAscents: number;
  uniquePeaks: number;
  maxAltitudeM: number;
  totalEp: number;
  totalCairns: number;
  levelIdx: number;
};

/**
 * Builds the minimal AltStats shape that meetsLevel() needs, from a raw
 * array of unique-peak altitudes. Single source of truth — never duplicate
 * these threshold numbers anywhere else.
 */
export function altStatsFromAlts(alts: number[]): HomeData["stats"] {
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
 * Returns the number of completed levels (1 = Scout base minimum, …, 6 = Zenith).
 * Uses LEVEL_DEFS from level-utils.ts as the single source of truth.
 */
export function computeLevelIdx(uniquePeaks: number, uniqueAlts: number[]): number {
  const altStats = altStatsFromAlts(uniqueAlts);
  let idx = 0;
  for (const def of LEVEL_DEFS) {
    if (meetsLevel(def, uniquePeaks, altStats)) idx = def.idx;
    else break;
  }
  return idx;
}

/**
 * Aggregates a user's ascents into the user_stats row values.
 * - uniquePeaks dedupes by peakId; totalAscents and totalEp count repeats.
 * - totalEp falls back to 1 for peaks without a rarity row.
 * - totalCairns counts every ascent of a mythic peak (repeats included).
 */
export function aggregateUserStats(ascents: AscentForStats[]): UserStatsAggregate {
  const seenPeaks = new Map<string, number>(); // peakId → altitudeM
  let totalEp = 0;
  let totalCairns = 0;

  for (const a of ascents) {
    if (!seenPeaks.has(a.peakId)) seenPeaks.set(a.peakId, a.peak.altitudeM);
    totalEp += a.peak.rarity?.ep ?? 1;
    if (a.peak.isMythic) totalCairns++;
  }

  const uniqueAlts = [...seenPeaks.values()];
  return {
    totalAscents: ascents.length,
    uniquePeaks: seenPeaks.size,
    maxAltitudeM: uniqueAlts.length > 0 ? Math.max(...uniqueAlts) : 0,
    totalEp,
    totalCairns,
    levelIdx: computeLevelIdx(seenPeaks.size, uniqueAlts),
  };
}
