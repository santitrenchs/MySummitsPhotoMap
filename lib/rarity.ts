// ─── Single source of truth for the rarity system ────────────────────────────
//
// To change a color, label, EP reward, or scoreWeight → edit RARITIES only.
// Everything else (lookup maps, MapLibre expressions) is derived automatically.
//
// ⚠️  If you change minAlt or add/remove tiers, the DB field `Peak.rarityId`
//     will be out of sync with the new thresholds. Run:
//
//       DATABASE_URL="..." npx tsx scripts/recompute-rarity.ts          ← diff
//       DATABASE_URL="..." npx tsx scripts/recompute-rarity.ts --apply  ← write

export type RarityId =
  | "daisy"
  | "gentian"
  | "edelweiss"
  | "saxifrage"
  | "cinquefoil"
  | "snow_lotus";

export const RARITIES = [
  { id: "daisy"      as RarityId, label: "Daisy",      color: "#00995C", colorDark: "#00763d", minAlt: 0,    ep: 8,    scoreWeight: 0.2 },
  { id: "gentian"    as RarityId, label: "Gentian",    color: "#A855F7", colorDark: "#7c3aed", minAlt: 1500, ep: 16,   scoreWeight: 0.3 },
  { id: "edelweiss"  as RarityId, label: "Edelweiss",  color: "#3B82F6", colorDark: "#2563eb", minAlt: 3000, ep: 20,   scoreWeight: 0.4 },
  { id: "saxifrage"  as RarityId, label: "Saxifrage",  color: "#F97316", colorDark: "#c55e0a", minAlt: 5000, ep: 100,  scoreWeight: 0.7 },
  { id: "cinquefoil" as RarityId, label: "Cinquefoil", color: "#EAB308", colorDark: "#a87e06", minAlt: 7000, ep: 500,  scoreWeight: 1.0 },
  { id: "snow_lotus" as RarityId, label: "Snow Lotus", color: "#FFD700", colorDark: "#b8960c", minAlt: 8000, ep: 1000, scoreWeight: 1.0 },
] as const;

// ─── Derived lookup maps ──────────────────────────────────────────────────────

export const RARITY_COLORS: Record<string, string> = {
  ...Object.fromEntries(RARITIES.map((r) => [r.id, r.color])),
  // DB legacy / flag rarities not in the altitude system
  lavender: "#A855F7",
  mythic:   "#FFD700",
};

export const RARITY_LABELS: Record<RarityId, string> =
  Object.fromEntries(RARITIES.map((r) => [r.id, r.label])) as Record<RarityId, string>;

export const RARITY_EP: Record<RarityId, number> =
  Object.fromEntries(RARITIES.map((r) => [r.id, r.ep])) as Record<RarityId, number>;

export const RARITY_SCORE_WEIGHTS: Record<string, number> = {
  ...Object.fromEntries(RARITIES.map((r) => [r.id, r.scoreWeight])),
  lavender: 0.3,
  mythic:   1.0,
};

// ─── Altitude → rarityId ──────────────────────────────────────────────────────

export function getRarityId(altitudeM: number): RarityId {
  for (let i = RARITIES.length - 1; i >= 0; i--) {
    if (altitudeM >= RARITIES[i].minAlt) return RARITIES[i].id;
  }
  return "daisy";
}

export function getRarityColor(altitudeM: number): string {
  return RARITY_COLORS[getRarityId(altitudeM)];
}

// ─── MapLibre expressions ─────────────────────────────────────────────────────

// match expression keyed on DB rarityId property (used in MapView unclustered layer)
export const RARITY_ID_MATCH_EXPR: unknown[] = [
  "match", ["get", "rarityId"],
  ...([...RARITIES, { id: "lavender", color: "#A855F7" }, { id: "mythic", color: "#FFD700" }]
    .flatMap((r) => [r.id, r.color])),
  "#60a5fa", // fallback
];

// step expression keyed on numeric altitude property (used in PeakMiniMap nearby dots)
export const RARITY_ALT_STEP_EXPR: unknown[] = [
  "step", ["get", "alt"],
  RARITIES[0].color,
  ...RARITIES.slice(1).flatMap((r) => [r.minAlt, r.color]),
];
