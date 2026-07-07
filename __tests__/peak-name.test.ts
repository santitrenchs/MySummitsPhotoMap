import { describe, it, expect } from "vitest";
import { peakDisplayName, peakDisplayParts } from "@/lib/peak-name";

describe("peakDisplayName() — non-Western names flip to nameEn", () => {
  it("CJK (Mount Fuji)", () => {
    expect(peakDisplayName({ name: "富士山", nameEn: "Mount Fuji" })).toBe("Mount Fuji");
  });

  it("Cyrillic (Elbrus)", () => {
    expect(peakDisplayName({ name: "Эльбрус", nameEn: "Elbrus" })).toBe("Elbrus");
  });

  it("Hangul (Hallasan)", () => {
    expect(peakDisplayName({ name: "한라산", nameEn: "Hallasan" })).toBe("Hallasan");
  });

  it("Greek (Olympus)", () => {
    expect(peakDisplayName({ name: "Όλυμπος", nameEn: "Mount Olympus" })).toBe("Mount Olympus");
  });

  it("Arabic (Toubkal)", () => {
    expect(peakDisplayName({ name: "جبل توبقال", nameEn: "Toubkal" })).toBe("Toubkal");
  });

  it("Devanagari (Sagarmatha / Everest)", () => {
    expect(peakDisplayName({ name: "सगरमाथा", nameEn: "Mount Everest" })).toBe("Mount Everest");
  });

  it("Thai (Doi Inthanon)", () => {
    expect(peakDisplayName({ name: "ดอยอินทนนท์", nameEn: "Doi Inthanon" })).toBe("Doi Inthanon");
  });

  it("mixed name with a stray Latin char still flips (script detection, not has-Latin)", () => {
    // Documented case: "俄宗巴岗 I (丹增峰)" contains a Latin "I" but is clearly non-Western
    expect(peakDisplayName({ name: "俄宗巴岗 I (丹增峰)", nameEn: "Ezong Bagang I" })).toBe("Ezong Bagang I");
  });
});

describe("peakDisplayName() — Western names keep the original", () => {
  it.each([
    "Pedraforca",
    "Müller",       // diacritics are still Western
    "Cervino",
    "K2",           // digits + Latin
    "Pic de l'Estanyó",
    "Großglockner", // ß + umlaut
  ])("'%s' is not flipped even when nameEn exists", (name) => {
    expect(peakDisplayName({ name, nameEn: "Some English Name" })).toBe(name);
  });
});

describe("peakDisplayName() — missing or unusable nameEn", () => {
  it("keeps the original when nameEn is null", () => {
    expect(peakDisplayName({ name: "富士山", nameEn: null })).toBe("富士山");
  });

  it("keeps the original when nameEn is undefined", () => {
    expect(peakDisplayName({ name: "富士山" })).toBe("富士山");
  });

  it("keeps the original when nameEn is empty string", () => {
    expect(peakDisplayName({ name: "富士山", nameEn: "" })).toBe("富士山");
  });

  it("keeps the original when nameEn has no Latin chars (useless transliteration)", () => {
    expect(peakDisplayName({ name: "富士山", nameEn: "ふじさん" })).toBe("富士山");
  });
});

describe("peakDisplayParts()", () => {
  it("returns { primary: nameEn, original: name } when flipped", () => {
    expect(peakDisplayParts({ name: "富士山", nameEn: "Mount Fuji" })).toEqual({
      primary: "Mount Fuji",
      original: "富士山",
    });
  });

  it("returns { primary: name, original: null } for Western names", () => {
    expect(peakDisplayParts({ name: "Pedraforca", nameEn: "Pedraforca" })).toEqual({
      primary: "Pedraforca",
      original: null,
    });
  });

  it("returns { primary: name, original: null } when nameEn is missing", () => {
    expect(peakDisplayParts({ name: "Эльбрус", nameEn: null })).toEqual({
      primary: "Эльбрус",
      original: null,
    });
  });
});
