/**
 * GET /api/v1/config
 *
 * Public, no-auth endpoint.  Returns the app-wide constants that mobile clients
 * (iOS / Android) need to avoid hard-coding them in the binary:
 *
 *   • rarities  — full rarity catalogue with labels, colors, ep, scoreWeight
 *   • levelDefs — gamification level definitions
 *
 * CDN-cacheable for 1 hour; safe to call on every app launch.
 */

import { NextResponse } from "next/server";
import { RARITIES }     from "@/lib/rarity";
import { LEVEL_DEFS }   from "@/lib/level-utils";

// Level names in English (the nameKey is an i18n key, resolve it here for mobile)
const LEVEL_NAMES: Record<string, string> = {
  home_level1: "Pathfinder",
  home_level2: "Peak Walker",
  home_level3: "Summit Tamer",
  home_level4: "Sky Breaker",
  home_level5: "Mythic Summiteer",
  home_level6: "Apex Warden",
};

export async function GET() {
  const rarities = RARITIES.map((r) => ({
    id:          r.id,
    label:       r.label,
    color:       r.color,
    colorDark:   r.colorDark,
    minAlt:      r.minAlt,
    ep:          r.ep,
    scoreWeight: r.scoreWeight,
  }));

  const levelDefs = LEVEL_DEFS.map((d) => ({
    id:          d.idx,
    name:        LEVEL_NAMES[d.nameKey as string] ?? String(d.nameKey),
    emoji:       d.emoji,
    minAscents:  d.targetAscents ?? 0,
  }));

  return NextResponse.json(
    { rarities, levelDefs },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
