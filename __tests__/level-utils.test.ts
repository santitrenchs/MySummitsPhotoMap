import { describe, it, expect } from "vitest";
import { meetsLevel, getLevelState, getAltCount, LEVEL_DEFS } from "@/lib/level-utils";
import type { HomeData } from "@/lib/services/home.service";

function makeStats(overrides: Partial<HomeData["stats"]> = {}): HomeData["stats"] {
  return {
    totalAscents: 0,
    totalPhotos: 0,
    uniquePeaks: 0,
    totalRegions: 0,
    friendsCount: 0,
    maxAltitude: 0,
    peaks1000plus: 0,
    peaks1500plus: 0,
    peaks2000plus: 0,
    peaks3000plus: 0,
    peaks4000plus: 0,
    peaks4500plus: 0,
    peaks5000plus: 0,
    peaks6000plus: 0,
    peaks6500plus: 0,
    peaks8000plus: 0,
    rarityBreakdown: { daisy: 0, gentian: 0, edelweiss: 0, saxifrage: 0, cinquefoil: 0, snow_lotus: 0 },
    ...overrides,
  };
}

describe("getAltCount()", () => {
  const stats = makeStats({
    peaks1000plus: 10,
    peaks1500plus: 9,
    peaks2000plus: 7,
    peaks3000plus: 4,
    peaks4000plus: 3,
    peaks4500plus: 2,
    peaks5000plus: 1,
    peaks6000plus: 0,
    peaks6500plus: 0,
    peaks8000plus: 0,
  });

  it("returns peaks1000plus for threshold < 1500", () => {
    expect(getAltCount(stats, 1000)).toBe(10);
  });

  it("returns peaks1500plus for threshold 1500–1999", () => {
    expect(getAltCount(stats, 1500)).toBe(9);
  });

  it("returns peaks2000plus for threshold 2000–2999", () => {
    expect(getAltCount(stats, 2000)).toBe(7);
  });

  it("returns peaks3000plus for threshold 3000–3999", () => {
    expect(getAltCount(stats, 3000)).toBe(4);
  });

  it("returns peaks4000plus for threshold 4000–4499", () => {
    expect(getAltCount(stats, 4000)).toBe(3);
  });

  it("returns peaks4500plus for threshold 4500–4999", () => {
    expect(getAltCount(stats, 4500)).toBe(2);
  });

  it("returns peaks5000plus for threshold 5000–6499", () => {
    expect(getAltCount(stats, 5000)).toBe(1);
  });

  it("returns peaks6000plus for threshold 6000–6499", () => {
    expect(getAltCount(stats, 6000)).toBe(0);
  });

  it("returns peaks6500plus for threshold 6500–7999", () => {
    expect(getAltCount(stats, 6500)).toBe(0);
  });

  it("returns peaks8000plus for threshold >= 8000", () => {
    expect(getAltCount(stats, 8000)).toBe(0);
  });
});

describe("meetsLevel()", () => {
  // LEVEL_DEFS[0]: 20 unique peaks + 1×2000m
  // LEVEL_DEFS[5]: 300 unique peaks + 1×8000m
  const level1 = LEVEL_DEFS[0];
  const level6 = LEVEL_DEFS[5];

  it("fails when unique peak count is below target", () => {
    expect(meetsLevel(level1, 19, makeStats({ peaks2000plus: 1 }))).toBe(false);
  });

  it("fails when count is met but altReq is not", () => {
    expect(meetsLevel(level1, 20, makeStats({ peaks2000plus: 0 }))).toBe(false);
  });

  it("passes when both unique peak count and altReq are met", () => {
    expect(meetsLevel(level1, 20, makeStats({ peaks2000plus: 1 }))).toBe(true);
  });

  it("passes with excess peaks and altReqs", () => {
    expect(meetsLevel(level1, 100, makeStats({ peaks2000plus: 5 }))).toBe(true);
  });

  it("Zenith requires 300 unique peaks + 1×8000m", () => {
    expect(meetsLevel(level6, 300, makeStats({ peaks8000plus: 0 }))).toBe(false);
    expect(meetsLevel(level6, 299, makeStats({ peaks8000plus: 1 }))).toBe(false);
    expect(meetsLevel(level6, 300, makeStats({ peaks8000plus: 1 }))).toBe(true);
  });
});

describe("getLevelState()", () => {
  it("returns level index 0 for a fresh user (0 peaks)", () => {
    const { currentIdx } = getLevelState(makeStats());
    expect(currentIdx).toBe(0);
  });

  it("advances to level 1 when first level is met (20 unique peaks + 1×2000m)", () => {
    const stats = makeStats({ uniquePeaks: 20, peaks2000plus: 1 });
    const { currentIdx } = getLevelState(stats);
    expect(currentIdx).toBe(1);
  });

  it("reaches max level (Zenith) when all requirements are met", () => {
    const stats = makeStats({
      uniquePeaks: 300,
      peaks2000plus: 1, peaks3000plus: 1, peaks4000plus: 1,
      peaks5000plus: 1, peaks6500plus: 1, peaks8000plus: 1,
    });
    const { isMaxLevel, currentIdx } = getLevelState(stats);
    expect(isMaxLevel).toBe(true);
    expect(currentIdx).toBe(LEVEL_DEFS.length - 1);
  });

  it("isMaxLevel is false when Zenith count is met but altitude is not", () => {
    const stats = makeStats({
      uniquePeaks: 300,
      peaks2000plus: 1, peaks3000plus: 1, peaks4000plus: 1,
      peaks5000plus: 1, peaks6500plus: 1, peaks8000plus: 0,
    });
    const { isMaxLevel } = getLevelState(stats);
    expect(isMaxLevel).toBe(false);
  });

  it("next is null at max level", () => {
    const stats = makeStats({
      uniquePeaks: 300,
      peaks2000plus: 1, peaks3000plus: 1, peaks4000plus: 1,
      peaks5000plus: 1, peaks6500plus: 1, peaks8000plus: 1,
    });
    const { next, isMaxLevel } = getLevelState(stats);
    if (isMaxLevel) expect(next).toBeNull();
  });

  it("next points to the next unachieved level", () => {
    // Meets Scout (20 unique + 2000m) but not Guide (50 unique + 3000m)
    const stats = makeStats({ uniquePeaks: 20, peaks2000plus: 1, peaks3000plus: 0 });
    const { currentIdx, next } = getLevelState(stats);
    expect(currentIdx).toBe(1);
    expect(next?.idx).toBe(3); // LEVEL_DEFS[2].idx = 3
  });
});
