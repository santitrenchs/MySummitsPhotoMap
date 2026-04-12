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

/** Simple string interpolation: i("Hello {name}", { name: "World" }) → "Hello World" */
export function i(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export function isValidLocale(locale: string): locale is Locale {
  return locale in LOCALES;
}
