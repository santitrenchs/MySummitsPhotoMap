import type { HomeData } from "@/lib/services/home.service";
import type { Dict } from "@/lib/i18n/types";

export type AltReq = { threshold: number; count: number };
export type LevelDef = {
  idx: number;
  emoji: string;
  nameKey: keyof Dict;
  targetAscents?: number;
  altReqs?: AltReq[];
  quoteKey?: keyof Dict;
  heroBg?: string;
};

// Levels are ranges, not entry gates.
// idx=1 (Scout) is the base level — everyone starts here, no requirements.
// Each subsequent level requires BOTH unique peaks AND ≥1 peak above the altitude threshold.
// targetAscents counts UNIQUE peaks climbed (not total ascents).
export const LEVEL_DEFS: LevelDef[] = [
  { idx: 1, emoji: "🌱", nameKey: "home_level1" },                                                                                                                              // Scout   — base, always met
  { idx: 2, emoji: "🥾", nameKey: "home_level2", targetAscents: 20,  altReqs: [{ threshold: 2000, count: 1 }] },                                                               // Guide
  { idx: 3, emoji: "🧭", nameKey: "home_level3", targetAscents: 50,  altReqs: [{ threshold: 3000, count: 1 }] },                                                               // Explorer
  { idx: 4, emoji: "⛰️", nameKey: "home_level4", targetAscents: 100, altReqs: [{ threshold: 4000, count: 1 }] },                                                               // Alpinist
  { idx: 5, emoji: "🏔️", nameKey: "home_level5", targetAscents: 150, altReqs: [{ threshold: 5000, count: 1 }] },                                                               // Master
  { idx: 6, emoji: "👑", nameKey: "home_level6", targetAscents: 220, altReqs: [{ threshold: 6500, count: 1 }], quoteKey: "home_level6Quote", heroBg: "/levels/messner.jpeg" }, // Zenith
];

export function getAltCount(stats: HomeData["stats"], threshold: number): number {
  if (threshold >= 8000) return stats.peaks8000plus;
  if (threshold >= 6500) return stats.peaks6500plus;
  if (threshold >= 6000) return stats.peaks6000plus;
  if (threshold >= 5000) return stats.peaks5000plus;
  if (threshold >= 4500) return stats.peaks4500plus;
  if (threshold >= 4000) return stats.peaks4000plus;
  if (threshold >= 3000) return stats.peaks3000plus;
  if (threshold >= 2000) return stats.peaks2000plus;
  if (threshold >= 1500) return stats.peaks1500plus;
  return stats.peaks1000plus;
}

export function meetsLevel(def: LevelDef, uniquePeaks: number, stats: HomeData["stats"]): boolean {
  if (def.targetAscents == null) return true;
  if (uniquePeaks < def.targetAscents) return false;
  return !def.altReqs || def.altReqs.every((r) => getAltCount(stats, r.threshold) >= r.count);
}

export function getLevelState(stats: HomeData["stats"]) {
  let currentIdx = LEVEL_DEFS.length - 1;
  for (let i = 0; i < LEVEL_DEFS.length; i++) {
    if (!meetsLevel(LEVEL_DEFS[i], stats.uniquePeaks, stats)) {
      currentIdx = i;
      break;
    }
  }
  const isMaxLevel = currentIdx === LEVEL_DEFS.length - 1
    && meetsLevel(LEVEL_DEFS[currentIdx], stats.uniquePeaks, stats);
  const current = LEVEL_DEFS[currentIdx];
  const next = currentIdx < LEVEL_DEFS.length - 1 ? LEVEL_DEFS[currentIdx + 1] : null;
  return { currentIdx, current, next, isMaxLevel };
}
