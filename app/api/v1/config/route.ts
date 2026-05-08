import { NextResponse } from "next/server";
import { RARITIES } from "@/lib/rarity";
import { LEVEL_DEFS } from "@/lib/level-utils";

// Public endpoint — no auth required.
// Mobile apps fetch this once on launch and cache it.
// Contains all constants needed to render rarities and levels without hardcoding.
export async function GET() {
  return NextResponse.json({
    rarities: RARITIES.map((r) => ({
      id:          r.id,
      label:       r.label,
      color:       r.color,
      colorDark:   r.colorDark,
      minAlt:      r.minAlt,
      ep:          r.ep,
      scoreWeight: r.scoreWeight,
    })),
    levels: LEVEL_DEFS.map((l) => ({
      idx:           l.idx,
      emoji:         l.emoji,
      nameKey:       l.nameKey,
      targetAscents: l.targetAscents ?? null,
      altReqs:       l.altReqs ?? [],
    })),
  }, {
    headers: {
      // Cache 1 hour on CDN — these constants rarely change
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
