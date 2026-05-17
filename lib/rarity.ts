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
  | "heather"
  | "gentian"
  | "tundra"
  | "edelweiss"
  | "draba"
  | "saxifrage"
  | "cinquefoil"
  | "snow_lotus";

export const RARITIES = [
  { id: "daisy"      as RarityId, label: "Daisy",      color: "#00995C", colorDark: "#00763d", minAlt: 0,    ep: 10,   scoreWeight: 0.10 },
  { id: "heather"    as RarityId, label: "Heather",    color: "#06B6D4", colorDark: "#0591a8", minAlt: 1000, ep: 20,   scoreWeight: 0.15 },
  { id: "gentian"    as RarityId, label: "Gentian",    color: "#1E40AF", colorDark: "#1e3a8a", minAlt: 2000, ep: 30,   scoreWeight: 0.20 },
  { id: "tundra"     as RarityId, label: "Tundra",     color: "#0E7490", colorDark: "#0c5f76", minAlt: 3000, ep: 60,   scoreWeight: 0.30 },
  { id: "edelweiss"  as RarityId, label: "Edelweiss",  color: "#A855F7", colorDark: "#7c3aed", minAlt: 4000, ep: 120,  scoreWeight: 0.40 },
  { id: "draba"      as RarityId, label: "Draba",      color: "#EC4899", colorDark: "#be185d", minAlt: 5000, ep: 250,  scoreWeight: 0.60 },
  { id: "saxifrage"  as RarityId, label: "Saxifrage",  color: "#F97316", colorDark: "#c55e0a", minAlt: 6000, ep: 500,  scoreWeight: 0.75 },
  { id: "cinquefoil" as RarityId, label: "Cinquefoil", color: "#EAB308", colorDark: "#a87e06", minAlt: 7000, ep: 1000, scoreWeight: 0.90 },
  { id: "snow_lotus" as RarityId, label: "Snow Lotus", color: "#94A3B8", colorDark: "#64748b", minAlt: 8000, ep: 2000, scoreWeight: 1.00 },
] as const;

// ─── Derived lookup maps ──────────────────────────────────────────────────────

export const RARITY_COLORS: Record<string, string> = {
  ...Object.fromEntries(RARITIES.map((r) => [r.id, r.color])),
  // DB legacy / flag rarities not in the altitude system
  lavender: "#A855F7",
  mythic:   "#FFD700",
};

// Rarity icon — same symbol for all rarities, only color changes (✿)
export const RARITY_ICON = "✿";

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
