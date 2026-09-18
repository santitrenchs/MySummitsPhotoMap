import { describe, it, expect } from "vitest";
import { romanizePeak, cyrillicProfileFor } from "@/lib/romanize-peak";

describe("romanizePeak — Cyrillic is language-dependent, not script-dependent", () => {
  // The arbiter is the catalogue itself: these peaks carry a human-written
  // `name:en` in OSM, and the romanizer must agree with it.
  it("matches OSM's own name:en for Russian-convention countries", () => {
    expect(romanizePeak("Деволи Сурх", "UZ")).toBe("Devoli Surkh"); // OSM: Devoli Surkh
    expect(romanizePeak("Шавур-Сай", "UZ")).toBe("Shavur-Say");     // OSM: Shavur-Say
  });

  it("uses kh/ts for Russian and the languages that borrowed BGN/PCGN", () => {
    expect(romanizePeak("Ходжа Буз Борак", "UZ")).toBe("Khodzha Buz Borak");
    expect(romanizePeak("Хан-Тенгри", "KZ")).toBe("Khan-Tengri");
  });

  it("keeps h/c for Serbian and Macedonian, where Gaj's Latin is co-official", () => {
    // Applying the Russian rule here would produce "Khvosno" / "Tsrn Vrv".
    expect(romanizePeak("Хвосно", "RS")).toBe("Hvosno");
    expect(romanizePeak("Црн Врв", "MK")).toBe("Crn Vrv");
  });

  it("uses h + ts for Bulgarian, which sits between the two", () => {
    expect(romanizePeak("Царев връх", "BG")).toBe("Tsarev Vrh");
  });

  it("falls back to the package default for an unknown country", () => {
    expect(romanizePeak("Хвосно", null)).toBe("Hvosno");
    expect(romanizePeak("Хвосно", "ZZ")).toBe("Hvosno");
  });

  it("leaves non-Cyrillic scripts untouched by the profile", () => {
    expect(romanizePeak("한라산", "KR")).toBe("Hallasan");
    expect(romanizePeak("富士山", "JP")).toBe("Fu Shi Shan"); // kanji get a Chinese reading — known limit
  });
});

describe("cyrillicProfileFor", () => {
  it("maps Caucasus countries to the Russian profile", () => {
    // A Cyrillic name in Georgia is a Russian one; Georgian script is not Cyrillic.
    expect(cyrillicProfileFor("GE")).toBe("ru");
  });

  it("returns null for countries with no Cyrillic peaks", () => {
    expect(cyrillicProfileFor("ES")).toBeNull();
    expect(cyrillicProfileFor(null)).toBeNull();
  });
});

describe("romanizePeak — initialisms", () => {
  it("does not expand ц inside an all-caps initialism", () => {
    // Three peaks in RU/KZ/KG are named after the sports club. BGN/PCGN is a
    // rule for names: applied here it would give "TsSKA".
    expect(romanizePeak("ЦСКА", "RU")).toBe("CSKA");
  });

  it("still applies the profile to the rest of a mixed name", () => {
    expect(romanizePeak("пик ЦСКА", "RU")).toBe("Pik CSKA");
    expect(romanizePeak("Цагаан хөтөл", "MN")).toBe("Tsagaan Khotol");
  });
});
