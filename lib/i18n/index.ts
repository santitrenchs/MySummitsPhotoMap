import type { Locale, Dict } from "./types";
import { en } from "./en";
import { es } from "./es";
import { ca } from "./ca";
import { fr } from "./fr";
import { de } from "./de";

export type { Locale, Dict };
export { en };

export const LOCALES: Record<Locale, Dict> = { en, es, ca, fr, de };

export const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "🇬🇧 English" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "ca", label: "🏴 Català" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "de", label: "🇩🇪 Deutsch" },
];

export function getT(locale: string): Dict {
  return LOCALES[locale as Locale] ?? en;
}

/**
 * String interpolation with basic plural support.
 *
 * Simple vars:   i("Hello {name}", { name: "World" }) → "Hello World"
 * Plural syntax: i("{n} summit{n,plural,=1{}other{s}}", { n: 3 }) → "3 summits"
 *                i("{n} summit{n,plural,=1{}other{s}}", { n: 1 }) → "1 summit"
 */
export function i(s: string, vars: Record<string, string | number>): string {
  // 1. Resolve plural blocks: {key,plural,=1{one}other{many}}
  // Uses [^{}] so braces are not ambiguous, correctly handles empty inner content like =1{}
  s = s.replace(
    /\{(\w+),plural,((?:[^{}]|\{[^{}]*\})*)\}/g,
    (_, key, rules) => {
      const n = Number(vars[key] ?? 0);
      // Parse =N{...} and other{...} tokens
      const exactMatch = rules.match(new RegExp(`=\\s*${n}\\{([^}]*)\\}`));
      if (exactMatch) return exactMatch[1];
      const otherMatch = rules.match(/other\{([^}]*)\}/);
      return otherMatch ? otherMatch[1] : "";
    }
  );
  // 2. Resolve simple {key} placeholders
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export function isValidLocale(locale: string): locale is Locale {
  return locale in LOCALES;
}
