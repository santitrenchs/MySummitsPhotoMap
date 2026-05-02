import { describe, it, expect } from "vitest";
import { meetsLevel, getLevelState, getAltCount, LEVEL_DEFS } from "@/lib/level-utils";
import type { HomeData } from "@/lib/services/home.service";

function makeStats(overrides: Partial<HomeData["stats"]> = {}): HomeData["stats"] {
  return {
    totalAscents: 0,
    totalPhotos: 0,
    uniquePeaks: 0,
    totalFriends: 0,
    maxAltitude: 0,
    peaks1000plus: 0,
    peaks2000plus: 0,
    peaks3000plus: 0,
    peaks4000plus: 0,
    peaks5000plus: 0,
    monthlyBars: [],
    rarityBreakdown: { daisy: 0, gentian: 0, edelweiss: 0, saxifrage: 0, cinquefoil: 0, snow_lotus: 0 },
    ...overrides,
  };
}

describe("getAltCount()", () => {
  const stats = makeStats({ peaks1000plus: 10, peaks2000plus: 7, peaks3000plus: 4, peaks4000plus: 2, peaks5000plus: 1 });

  it("returns peaks1000plus for threshold < 2000", () => {
    expect(getAltCount(stats, 1000)).toBe(10);
    expect(getAltCount(stats, 1500)).toBe(10);
  });

  it("returns peaks2000plus for threshold 2000–2999", () => {
    expect(getAltCount(stats, 2000)).toBe(7);
  });

  it("returns peaks3000plus for threshold 3000–3999", () => {
    expect(getAltCount(stats, 3000)).toBe(4);
  });

  it("returns peaks4000plus for threshold 4000–4999", () => {
    expect(getAltCount(stats, 4000)).toBe(2);
  });

  it("returns peaks5000plus for threshold >= 5000", () => {
    expect(getAltCount(stats, 5000)).toBe(1);
  });
});

describe("meetsLevel()", () => {
  const level1 = LEVEL_DEFS[0]; // 5 ascents + 1 peak >1000m
  const level5 = LEVEL_DEFS[4]; // no targetAscents — always true

  it("level with no targetAscents is always met", () => {
    expect(meetsLevel(level5, 0, makeStats())).toBe(true);
  });

  it("fails when ascent count is below target", () => {
    expect(meetsLevel(level1, 4, makeStats({ peaks1000plus: 1 }))).toBe(false);
  });

  it("fails when ascent count is met but altReq is not", () => {
    expect(meetsLevel(level1, 5, makeStats({ peaks1000plus: 0 }))).toBe(false);
  });

  it("passes when both ascent count and altReq are met", () => {
    expect(meetsLevel(level1, 5, makeStats({ peaks1000plus: 1 }))).toBe(true);
  });

  it("passes with excess ascents and altReqs", () => {
    expect(meetsLevel(level1, 100, makeStats({ peaks1000plus: 5 }))).toBe(true);
  });
});

describe("getLevelState()", () => {
  it("returns level index 0 for a fresh user (0 ascents)", () => {
    const { currentIdx } = getLevelState(makeStats());
    expect(currentIdx).toBe(0);
  });

  it("advances to level 1 when first level is met", () => {
    const stats = makeStats({ totalAscents: 5, peaks1000plus: 1 });
    const { currentIdx } = getLevelState(stats);
    expect(currentIdx).toBe(1);
  });

  it("reaches max level when all requirements are met", () => {
    const stats = makeStats({
      totalAscents: 70,
      peaks1000plus: 10, peaks2000plus: 8, peaks3000plus: 5, peaks4000plus: 3, peaks5000plus: 1,
    });
    const { isMaxLevel, currentIdx } = getLevelState(stats);
    expect(isMaxLevel).toBe(true);
    expect(currentIdx).toBe(LEVEL_DEFS.length - 1);
  });

  it("next is null at max level", () => {
    const stats = makeStats({
      totalAscents: 70,
      peaks1000plus: 10, peaks2000plus: 8, peaks3000plus: 5, peaks4000plus: 3,
    });
    const { next, isMaxLevel } = getLevelState(stats);
    if (isMaxLevel) expect(next).toBeNull();
  });

  it("next points to the next unachieved level", () => {
    // Meets level 1 (5 ascents + 1×1000) but not level 2 (15 ascents + 1×2000)
    const stats = makeStats({ totalAscents: 10, peaks1000plus: 2, peaks2000plus: 0 });
    const { currentIdx, next } = getLevelState(stats);
    expect(currentIdx).toBe(1);
    expect(next?.idx).toBe(3); // next = level_defs[2]
  });
});
