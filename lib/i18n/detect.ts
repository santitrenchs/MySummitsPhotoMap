import type { NextRequest } from "next/server";
import type { Locale } from "./types";

// Maps browser language tags (BCP 47) to supported locales.
// Longer/more-specific entries must come first so "ca-ES" matches before "ca".
const LANG_MAP: [string, Locale][] = [
  ["ca", "ca"],
  ["es", "es"],
  ["fr", "fr"],
  ["de", "de"],
  ["en", "en"],
];

function parseAcceptLanguage(header: string): Locale {
  // "ca-ES,ca;q=0.9,es;q=0.8,en-US,en;q=0.5"
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    for (const [prefix, locale] of LANG_MAP) {
      if (tag === prefix || tag.startsWith(prefix + "-")) return locale;
    }
  }
  return "en";
}

export function detectLocale(req: NextRequest): Locale {
  const header = req.headers.get("accept-language") ?? "";
  return parseAcceptLanguage(header);
}
