import { describe, it, expect } from "vitest";
import { LANDING_PEAKS } from "@/lib/data/landing-peaks";
import {
  formatAltitude,
  formatPeakDate,
  getPeakCardLabels,
  getPeakMessage,
  getPlaceTranslations,
} from "@/lib/i18n/peak-content";
import type { PeakLocale } from "@/lib/i18n/peaks";

const LOCALES: PeakLocale[] = ["es", "en", "fr", "de", "ca"];

describe("peak page content", () => {
  // `getPeakMessage` keys by slug and falls back to Spanish, so a mistyped key
  // shows a Spanish comment on the German page with no error anywhere. That is
  // exactly how "pica-destats" shipped wrong once — hence this test.
  it("has a distinct translated comment for every peak in every locale", () => {
    for (const peak of LANDING_PEAKS) {
      const es = getPeakMessage(peak.peakName, "es");
      expect(es, `missing es message for ${peak.peakName}`).not.toBe("");

      for (const locale of LOCALES.filter((l) => l !== "es")) {
        const message = getPeakMessage(peak.peakName, locale);
        expect(message, `missing ${locale} message for ${peak.peakName}`).not.toBe("");
        expect(
          message,
          `${locale} message for ${peak.peakName} fell back to Spanish`,
        ).not.toBe(es);
      }
    }
  });

  it("translates every country and mountain range used by the catalog", () => {
    // A place whose name is genuinely identical across languages (Vercors,
    // Wetterstein, Glen Coe, Lake District, Eryri) needs no entry.
    const SAME_IN_EVERY_LANGUAGE = new Set([
      "Andorra", "Vercors", "Wetterstein", "Lake District", "Eryri", "Glen Coe",
    ]);

    for (const peak of LANDING_PEAKS) {
      for (const place of [peak.country, peak.mountainRange]) {
        if (!place || SAME_IN_EVERY_LANGUAGE.has(place)) continue;
        const forms = getPlaceTranslations(place);
        expect(forms, `"${place}" is missing from PLACE_NAMES`).toBeDefined();
        for (const locale of LOCALES.filter((l) => l !== "es")) {
          // Identical to the Spanish form is fine (fr "Alpes"); absent is not.
          expect(forms?.[locale], `"${place}" has no ${locale} form`).toBeTruthy();
        }
      }
    }
  });

  it("formats dates and altitudes per locale", () => {
    expect(formatPeakDate("2024-08-14", "en")).toBe("Aug 14, 2024");
    expect(formatPeakDate("2024-08-14", "es")).toContain("2024");
    expect(formatAltitude(4808, "en")).toBe("4,808 m");
    expect(formatAltitude(4808, "es")).toBe("4.808 m");
  });

  it("carries the fictional-content disclaimer in every locale", () => {
    for (const locale of LOCALES) {
      expect(getPeakCardLabels(locale).disclaimer.length).toBeGreaterThan(20);
    }
  });

  it("stores ISO dates only — never a pre-formatted label", () => {
    for (const peak of LANDING_PEAKS) {
      expect(peak.dateISO, `${peak.peakName} has a non-ISO date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
