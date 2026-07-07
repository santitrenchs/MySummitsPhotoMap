import { describe, it, expect } from "vitest";
import {
  RARITIES,
  RARITY_COLORS,
  RARITY_EP,
  RARITY_LABELS,
  RARITY_SCORE_WEIGHTS,
  getRarityId,
  getRarityColor,
} from "@/lib/rarity";
import { isFeedRarity, rarityAltRange } from "@/lib/services/feed-merge";

describe("RARITIES definition", () => {
  it("has 9 tiers with unique ids", () => {
    expect(RARITIES).toHaveLength(9);
    expect(new Set(RARITIES.map((r) => r.id)).size).toBe(9);
  });

  it("is ordered by ascending minAlt starting at 0", () => {
    expect(RARITIES[0].minAlt).toBe(0);
    for (let i = 1; i < RARITIES.length; i++) {
      expect(RARITIES[i].minAlt).toBeGreaterThan(RARITIES[i - 1].minAlt);
    }
  });

  it("EP rewards grow monotonically with rarity", () => {
    for (let i = 1; i < RARITIES.length; i++) {
      expect(RARITIES[i].ep).toBeGreaterThan(RARITIES[i - 1].ep);
    }
  });
});

describe("getRarityId() — altitude boundaries", () => {
  it("maps exact tier boundaries to the upper tier", () => {
    expect(getRarityId(0)).toBe("daisy");
    expect(getRarityId(1000)).toBe("heather");
    expect(getRarityId(2000)).toBe("gentian");
    expect(getRarityId(3000)).toBe("tundra");
    expect(getRarityId(4000)).toBe("edelweiss");
    expect(getRarityId(5000)).toBe("draba");
    expect(getRarityId(6000)).toBe("saxifrage");
    expect(getRarityId(7000)).toBe("cinquefoil");
    expect(getRarityId(8000)).toBe("snow_lotus");
  });

  it("maps one meter below each boundary to the lower tier", () => {
    expect(getRarityId(999)).toBe("daisy");
    expect(getRarityId(1999)).toBe("heather");
    expect(getRarityId(2999)).toBe("gentian");
    expect(getRarityId(3999)).toBe("tundra");
    expect(getRarityId(4999)).toBe("edelweiss");
    expect(getRarityId(5999)).toBe("draba");
    expect(getRarityId(6999)).toBe("saxifrage");
    expect(getRarityId(7999)).toBe("cinquefoil");
  });

  it("has no upper cap (Everest is snow_lotus)", () => {
    expect(getRarityId(8848)).toBe("snow_lotus");
  });

  it("falls back to daisy for negative altitudes (defensive)", () => {
    expect(getRarityId(-10)).toBe("daisy");
  });

  it("getRarityColor returns the tier color", () => {
    expect(getRarityColor(4200)).toBe(RARITY_COLORS.edelweiss);
  });
});

describe("derived lookup maps — completeness", () => {
  it("RARITY_COLORS covers all 9 tiers plus legacy ids", () => {
    for (const r of RARITIES) expect(RARITY_COLORS[r.id]).toBe(r.color);
    expect(RARITY_COLORS.lavender).toBeDefined();
    expect(RARITY_COLORS.mythic).toBeDefined();
  });

  it("RARITY_LABELS and RARITY_EP cover all 9 tiers", () => {
    for (const r of RARITIES) {
      expect(RARITY_LABELS[r.id]).toBe(r.label);
      expect(RARITY_EP[r.id]).toBe(r.ep);
    }
  });

  it("RARITY_SCORE_WEIGHTS covers all 9 tiers plus legacy ids", () => {
    for (const r of RARITIES) expect(RARITY_SCORE_WEIGHTS[r.id]).toBe(r.scoreWeight);
    expect(RARITY_SCORE_WEIGHTS.lavender).toBeDefined();
    expect(RARITY_SCORE_WEIGHTS.mythic).toBeDefined();
  });
});

// Regression guard for the legacy 6-tier feed filter: the feed's rarity ranges
// must be DERIVED from RARITIES, never hand-rolled. Before 2026-07 the feed used
// a 6-tier scheme (gentian = 1500–3000, no heather/tundra/draba) so clicking
// those bars in the Stats rarity chart silently dropped the filter.
describe("feed rarity filter — consistency with RARITIES", () => {
  it("accepts every one of the 9 rarity ids (chart → feed link contract)", () => {
    for (const r of RARITIES) expect(isFeedRarity(r.id)).toBe(true);
  });

  it("rejects unknown and legacy-only ids", () => {
    expect(isFeedRarity("lavender")).toBe(false);
    expect(isFeedRarity("mythic")).toBe(false);
    expect(isFeedRarity("")).toBe(false);
  });

  it("each tier's altitude range matches RARITIES exactly", () => {
    for (let i = 0; i < RARITIES.length; i++) {
      const { min, max } = rarityAltRange(RARITIES[i].id);
      expect(min).toBe(RARITIES[i].minAlt);
      expect(max).toBe(i < RARITIES.length - 1 ? RARITIES[i + 1].minAlt : null);
    }
  });

  it("ranges are contiguous and cover every altitude without gaps or overlaps", () => {
    let prevMax: number | null = 0;
    for (const r of RARITIES) {
      const { min, max } = rarityAltRange(r.id);
      expect(min).toBe(prevMax);
      prevMax = max;
    }
    expect(prevMax).toBeNull(); // last tier is open-ended
  });

  it("an altitude filtered into a tier is classified into that same tier by getRarityId", () => {
    for (const r of RARITIES) {
      const { min, max } = rarityAltRange(r.id);
      expect(getRarityId(min)).toBe(r.id);
      if (max !== null) expect(getRarityId(max - 1)).toBe(r.id);
    }
  });
});
