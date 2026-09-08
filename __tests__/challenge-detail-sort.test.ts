import { describe, it, expect } from "vitest";
import { hasGroupingValue, byGroupThenAltitude } from "@/components/bitacora/ChallengeDetailClient";
import type { ChallengePeakRow } from "@/lib/services/challenge.service";

function peak(name: string, altitudeM: number, comarca: string | null = null): ChallengePeakRow {
  return {
    id: name, name, altitudeM, mountainRange: null, comarca, country: "ES",
    rarityId: "edelweiss", isMythic: false, done: false, lastAscentDate: null, photoUrl: null,
  };
}

describe("hasGroupingValue", () => {
  it("is false when nothing carries the field — the real case for every challenge today", () => {
    expect(hasGroupingValue([peak("Aneto", 3404), peak("Posets", 3369)], (p) => p.comarca)).toBe(false);
  });

  it("is false with a single distinct value: sorting by it would not reorder anything", () => {
    const peaks = [peak("Aneto", 3404, "Ribagorça"), peak("Posets", 3369, "Ribagorça")];
    expect(hasGroupingValue(peaks, (p) => p.comarca)).toBe(false);
  });

  it("is true from two distinct values on, even if others are null", () => {
    const peaks = [peak("Aneto", 3404, "Ribagorça"), peak("Estats", 3143, "Pallars"), peak("X", 3000)];
    expect(hasGroupingValue(peaks, (p) => p.comarca)).toBe(true);
  });
});

describe("byGroupThenAltitude", () => {
  it("groups alphabetically, highest first inside each group, and pushes the ungrouped last", () => {
    const peaks = [
      peak("sin comarca", 3500),
      peak("Pallars bajo", 3100, "Pallars"),
      peak("Ribagorça", 3404, "Ribagorça"),
      peak("Pallars alto", 3143, "Pallars"),
    ];
    expect([...peaks].sort(byGroupThenAltitude((p) => p.comarca)).map((p) => p.name)).toEqual([
      "Pallars alto", "Pallars bajo", "Ribagorça", "sin comarca",
    ]);
  });
});
