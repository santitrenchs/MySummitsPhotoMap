import { describe, expect, it } from "vitest";
import {
  COUNTRY_CODES, countryBounds, countryFromLocale, normalizeCountry, resolveSignupCountry, SUGGESTED_COUNTRIES,
} from "@/lib/country";

describe("countryFromLocale", () => {
  it("reads the region of the first tag", () => {
    expect(countryFromLocale("es-ES,es;q=0.9,en;q=0.8")).toBe("ES");
    expect(countryFromLocale("en-GB")).toBe("GB");
    expect(countryFromLocale("es_MX")).toBe("MX"); // Android style
    expect(countryFromLocale("zh-Hant-TW")).toBe("TW"); // script subtag skipped
  });

  it("does not borrow a region from a fallback language", () => {
    expect(countryFromLocale("es,en-US;q=0.8")).toBeNull();
  });

  it("returns null for numeric regions and empty input", () => {
    expect(countryFromLocale("es-419")).toBeNull();
    expect(countryFromLocale("")).toBeNull();
    expect(countryFromLocale(null)).toBeNull();
  });
});

describe("normalizeCountry", () => {
  it("accepts real codes in any case and rejects the rest", () => {
    expect(normalizeCountry("es")).toBe("ES");
    expect(normalizeCountry(" us ")).toBe("US");
    expect(normalizeCountry("ZZ")).toBeNull();
    expect(normalizeCountry(42)).toBeNull();
  });
});

describe("resolveSignupCountry", () => {
  it("prefers the form value, including an explicit null", () => {
    expect(resolveSignupCountry({ country: "fr" }, "es-ES")).toBe("FR");
    expect(resolveSignupCountry({ country: null }, "es-ES")).toBeNull();
  });

  it("falls back to the header only when the field is absent", () => {
    expect(resolveSignupCountry({}, "de-AT,de")).toBe("AT");
  });
});

describe("country tables", () => {
  it("only reference valid codes", () => {
    const codes = new Set<string>(COUNTRY_CODES);
    for (const list of Object.values(SUGGESTED_COUNTRIES)) for (const c of list) expect(codes.has(c)).toBe(true);
  });

  it("have well-formed boxes: west < east, south < north, inside the globe", () => {
    for (const code of COUNTRY_CODES) {
      const b = countryBounds(code);
      if (!b) continue;
      const [w, s, e, n] = b;
      expect(w, code).toBeLessThan(e);
      expect(s, code).toBeLessThan(n);
      expect(Math.abs(w) <= 180 && Math.abs(e) <= 180 && Math.abs(s) <= 90 && Math.abs(n) <= 90, code).toBe(true);
    }
  });

  it("frames Spain without the Canaries", () => {
    expect(countryBounds("ES")![1]).toBeGreaterThan(35);
    expect(countryBounds("RU")).toBeNull();
  });
});
