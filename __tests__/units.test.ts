import { describe, it, expect } from "vitest";
import { formatAltitude, altitudeValue, altitudeUnit, formatDistance, metresToFeet } from "@/lib/units";
import { getRarityId, RARITIES } from "@/lib/rarity";

describe("formatAltitude", () => {
  it("prints bare digits when no locale is given", () => {
    // Most peak rows have always rendered ungrouped; passing no locale is also
    // what keeps the server and the browser from disagreeing.
    expect(formatAltitude(3404)).toBe("3404 m");
  });

  it("groups with the locale when one is given", () => {
    expect(formatAltitude(3404, { locale: "en-GB" })).toBe("3,404 m");
    // Spanish CLDR leaves four-digit numbers ungrouped — that is the existing
    // behaviour of the cards, not a bug to fix here.
    expect(formatAltitude(3404, { locale: "es-ES" })).toBe("3404 m");
    expect(formatAltitude(14404, { locale: "es-ES" })).toBe("14.404 m");
  });

  it("forces the separator with grouping: always, as the SEO pages need", () => {
    expect(formatAltitude(4808, { locale: "es-ES", grouping: "always" })).toBe("4.808 m");
    expect(formatAltitude(4808, { locale: "de-DE", grouping: "always" })).toBe("4.808 m");
  });

  it("converts to whole feet in imperial", () => {
    // Aneto. A height is a survey figure, so no decimals.
    expect(formatAltitude(3404, { units: "imperial" })).toBe("11168 ft");
    expect(formatAltitude(3404, { units: "imperial", locale: "en-US" })).toBe("11,168 ft");
  });

  it("keeps the Colorado 14ers above 14,000 ft", () => {
    // The lowest peak of the challenge — the whole list is defined by this line.
    expect(metresToFeet(4269)).toBeGreaterThanOrEqual(14_000);
  });

  it("splits into value and unit for the stat cells that render them apart", () => {
    expect(altitudeValue(3404, { locale: "en-GB" })).toBe("3,404");
    expect(altitudeUnit()).toBe("m");
    expect(altitudeUnit("imperial")).toBe("ft");
  });
});

describe("formatDistance", () => {
  it("matches the behaviour of the two duplicate helpers it replaced", () => {
    expect(formatDistance(0.85)).toBe("850 m");
    expect(formatDistance(4.27)).toBe("4.3 km");
    expect(formatDistance(42.4)).toBe("42 km");
  });

  it("drops to feet under a mile in imperial", () => {
    expect(formatDistance(0.85, { units: "imperial" })).toBe("2789 ft");
    expect(formatDistance(4.27, { units: "imperial" })).toBe("2.7 mi");
    // 8 km is 4.97 mi: a round result must not print as "5.0 mi", and the
    // metric axis label that has always said "8 km" must not become "8.0 km".
    expect(formatDistance(8, { units: "imperial" })).toBe("5 mi");
    expect(formatDistance(8)).toBe("8 km");
    expect(formatDistance(42.4, { units: "imperial" })).toBe("26 mi");
  });
});

describe("the preference is display-only", () => {
  it("gives rarity no way to see the preference", () => {
    // The guarantee the whole feature rests on, asserted structurally rather
    // than by calling the function twice with the same argument: getRarityId
    // takes metres and nothing else, so no display preference can reach it.
    // If someone adds a units parameter, this fails and they have to justify it.
    expect(getRarityId.length).toBe(1);
    expect(getRarityId(3000)).toBe("tundra");
    expect(getRarityId(2999)).toBe("gentian");
    // Only the printed figure differs.
    expect(formatAltitude(8848, { units: "metric" })).toBe("8848 m");
    expect(formatAltitude(8848, { units: "imperial" })).toBe("29029 ft");
  });

  it("keeps every tier boundary unambiguous in feet", () => {
    // If two different metre values collapsed onto one foot value, two cards
    // with different rarities would print the same altitude and look broken.
    for (const r of RARITIES) {
      if (!r.minAlt) continue;
      expect(metresToFeet(r.minAlt - 1)).toBeLessThan(metresToFeet(r.minAlt));
    }
  });
});
