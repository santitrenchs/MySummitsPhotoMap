import { describe, it, expect } from "vitest";
import {
  aggregateUserStats,
  computeLevelIdx,
  type AscentForStats,
} from "@/lib/services/stats-compute";

function ascent(
  peakId: string,
  altitudeM: number,
  opts: { isMythic?: boolean; ep?: number | null } = {},
): AscentForStats {
  return {
    peakId,
    peak: {
      altitudeM,
      isMythic: opts.isMythic ?? false,
      rarity: opts.ep === null ? null : { ep: opts.ep ?? 10 },
    },
  };
}

/** n distinct peaks at the given altitude (ids p0…p{n-1}). */
function distinctPeaks(n: number, altitudeM: number): AscentForStats[] {
  return Array.from({ length: n }, (_, i) => ascent(`p${i}`, altitudeM));
}

describe("aggregateUserStats()", () => {
  it("returns zeros + Scout level for a user with no ascents", () => {
    expect(aggregateUserStats([])).toEqual({
      totalAscents: 0,
      uniquePeaks: 0,
      maxAltitudeM: 0,
      totalEp: 0,
      totalCairns: 0,
      levelIdx: 1, // Scout is the base level — everyone has it
    });
  });

  it("counts repeat ascents of the same peak in totalAscents but not uniquePeaks", () => {
    const stats = aggregateUserStats([
      ascent("aneto", 3404, { ep: 60 }),
      ascent("aneto", 3404, { ep: 60 }),
      ascent("aneto", 3404, { ep: 60 }),
    ]);
    expect(stats.totalAscents).toBe(3);
    expect(stats.uniquePeaks).toBe(1);
    // EP rewards every ascent, repeats included
    expect(stats.totalEp).toBe(180);
  });

  it("falls back to 1 EP for peaks without a rarity row or with null ep", () => {
    const stats = aggregateUserStats([
      ascent("a", 500, { ep: null }), // no rarity row
      ascent("b", 500, { ep: 20 }),
      { peakId: "c", peak: { altitudeM: 500, isMythic: false, rarity: { ep: null } } }, // row with null ep
    ]);
    expect(stats.totalEp).toBe(22);
  });

  it("counts a cairn per mythic ascent, repeats included", () => {
    const stats = aggregateUserStats([
      ascent("pedraforca", 2506, { isMythic: true }),
      ascent("pedraforca", 2506, { isMythic: true }),
      ascent("aneto", 3404),
    ]);
    expect(stats.totalCairns).toBe(2);
  });

  it("maxAltitudeM is the highest peak ever climbed", () => {
    const stats = aggregateUserStats([
      ascent("a", 1200),
      ascent("b", 3404),
      ascent("c", 2500),
    ]);
    expect(stats.maxAltitudeM).toBe(3404);
  });
});

describe("computeLevelIdx() — level thresholds (LEVEL_DEFS as source of truth)", () => {
  it("returns 1 (Scout) with no peaks", () => {
    expect(computeLevelIdx(0, [])).toBe(1);
  });

  it("stays Scout with 20 unique peaks but none above 2000m", () => {
    expect(computeLevelIdx(20, Array(20).fill(1500))).toBe(1);
  });

  it("stays Scout with a 2000m+ peak but only 19 unique peaks", () => {
    expect(computeLevelIdx(19, [...Array(18).fill(1500), 2100])).toBe(1);
  });

  it("reaches Guide with 20 unique peaks and one above 2000m", () => {
    expect(computeLevelIdx(20, [...Array(19).fill(1500), 2100])).toBe(2);
  });

  it("reaches Explorer with 50 unique + one above 3000m", () => {
    expect(computeLevelIdx(50, [...Array(48).fill(1500), 2100, 3100])).toBe(3);
  });

  it("a single high peak satisfies all lower altitude gates (counts are cumulative)", () => {
    // One 4200m peak counts for the 2000m, 3000m and 4000m gates at once.
    expect(computeLevelIdx(100, [...Array(99).fill(1500), 4200])).toBe(4); // Alpinist
  });

  it("stops at the first unmet level even if a later gate would be met", () => {
    // 30 unique (Guide met, Explorer needs 50) + an 8000m peak → still Guide.
    expect(computeLevelIdx(30, [...Array(29).fill(1500), 8091])).toBe(2);
  });

  it("reaches Zenith (6) with 220 unique + one above 6500m", () => {
    expect(computeLevelIdx(220, [...Array(219).fill(1500), 6800])).toBe(6);
  });

  it("stays Master (5) with 220 unique when the highest peak is below 6500m", () => {
    expect(computeLevelIdx(220, [...Array(219).fill(1500), 6400])).toBe(5);
  });
});

describe("aggregateUserStats() — levelIdx integration", () => {
  it("computes the level from deduped peaks, not raw ascents", () => {
    // 20 ascents but only 10 unique peaks → Scout, even with a 2000m+ summit
    const repeats = [
      ...distinctPeaks(9, 1500),
      ...Array.from({ length: 11 }, () => ascent("high", 2500)),
    ];
    const stats = aggregateUserStats(repeats);
    expect(stats.totalAscents).toBe(20);
    expect(stats.uniquePeaks).toBe(10);
    expect(stats.levelIdx).toBe(1);
  });
});
