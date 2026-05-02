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

export const LEVEL_DEFS: LevelDef[] = [
  { idx: 1, emoji: "🌱", nameKey: "home_level1", targetAscents: 5,  altReqs: [{ threshold: 1000, count: 1 }] },
  { idx: 2, emoji: "🥾", nameKey: "home_level2", targetAscents: 15, altReqs: [{ threshold: 2000, count: 1 }] },
  { idx: 3, emoji: "🧭", nameKey: "home_level3", targetAscents: 40, altReqs: [{ threshold: 3000, count: 1 }] },
  { idx: 4, emoji: "🏔️", nameKey: "home_level4", targetAscents: 70, altReqs: [{ threshold: 4000, count: 1 }] },
  { idx: 5, emoji: "👑", nameKey: "home_level5", quoteKey: "home_level5Quote", heroBg: "/levels/messner.jpeg" },
];

export function getAltCount(stats: HomeData["stats"], threshold: number): number {
  if (threshold >= 5000) return stats.peaks5000plus;
  if (threshold >= 4000) return stats.peaks4000plus;
  if (threshold >= 3000) return stats.peaks3000plus;
  if (threshold >= 2000) return stats.peaks2000plus;
  return stats.peaks1000plus;
}

export function meetsLevel(def: LevelDef, n: number, stats: HomeData["stats"]): boolean {
  if (def.targetAscents == null) return true;
  if (n < def.targetAscents) return false;
  return !def.altReqs || def.altReqs.every((r) => getAltCount(stats, r.threshold) >= r.count);
}

export function getLevelState(stats: HomeData["stats"]) {
  let currentIdx = LEVEL_DEFS.length - 1;
  for (let i = 0; i < LEVEL_DEFS.length - 1; i++) {
    if (!meetsLevel(LEVEL_DEFS[i], stats.totalAscents, stats)) {
      currentIdx = i;
      break;
    }
  }
  const current = LEVEL_DEFS[currentIdx];
  const next = currentIdx < LEVEL_DEFS.length - 1 ? LEVEL_DEFS[currentIdx + 1] : null;
  return { currentIdx, current, next, isMaxLevel: currentIdx === LEVEL_DEFS.length - 1 };
}
