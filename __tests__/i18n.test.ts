import { describe, it, expect } from "vitest";
import { i, getT, isValidLocale } from "@/lib/i18n";

describe("i() — string interpolation", () => {
  it("replaces a simple variable", () => {
    expect(i("Hello {name}", { name: "World" })).toBe("Hello World");
  });

  it("replaces multiple variables", () => {
    expect(i("{a} + {b} = {c}", { a: 1, b: 2, c: 3 })).toBe("1 + 2 = 3");
  });

  it("replaces numeric variables", () => {
    expect(i("{n} cimas", { n: 42 })).toBe("42 cimas");
  });

  it("leaves unknown placeholders as empty string", () => {
    expect(i("Hello {missing}", {})).toBe("Hello ");
  });

  it("plural — singular form (=1)", () => {
    expect(i("{n} summit{n,plural,=1{}other{s}}", { n: 1 })).toBe("1 summit");
  });

  it("plural — plural form (other)", () => {
    expect(i("{n} summit{n,plural,=1{}other{s}}", { n: 3 })).toBe("3 summits");
  });

  it("plural — zero uses other form", () => {
    expect(i("{n} summit{n,plural,=1{}other{s}}", { n: 0 })).toBe("0 summits");
  });

  it("plural — empty =1{} block produces no suffix", () => {
    // The =1 inner block is empty — must not bleed into outer content
    expect(i("need {n} more summit{n,plural,=1{}other{s}}", { n: 1 })).toBe("need 1 more summit");
  });

  it("plural — text before and after the block is preserved", () => {
    expect(i("Tienes {n} cima{n,plural,=1{}other{s}} más", { n: 2 })).toBe("Tienes 2 cimas más");
  });

  it("plural — works with non-numeric key name", () => {
    expect(i("{count} foto{count,plural,=1{}other{s}}", { count: 1 })).toBe("1 foto");
    expect(i("{count} foto{count,plural,=1{}other{s}}", { count: 5 })).toBe("5 fotos");
  });
});

describe("getT()", () => {
  it("returns Spanish dict for 'es'", () => {
    const t = getT("es");
    expect(t.save).toBe("Guardar");
  });

  it("returns English dict for 'en'", () => {
    const t = getT("en");
    expect(t.save).toBe("Save");
  });

  it("falls back to English for unknown locale", () => {
    const t = getT("xx");
    expect(t.save).toBe("Save");
  });
});

describe("isValidLocale()", () => {
  it("returns true for supported locales", () => {
    expect(isValidLocale("es")).toBe(true);
    expect(isValidLocale("en")).toBe(true);
    expect(isValidLocale("ca")).toBe(true);
    expect(isValidLocale("fr")).toBe(true);
    expect(isValidLocale("de")).toBe(true);
  });

  it("returns false for unknown locale", () => {
    expect(isValidLocale("xx")).toBe(false);
    expect(isValidLocale("")).toBe(false);
  });
});
