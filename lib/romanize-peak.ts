// ─── Peak romanization ───────────────────────────────────────────────────────
//
// Turns a non-Western `Peak.name` into the Latin `Peak.nameEn` that
// `lib/peak-name.ts` then shows to users. Used by `scripts/backfill-name-en.ts`
// and by the catalogue import.
//
// This lives in `lib/` rather than in the script so the rules are versioned,
// reviewable and unit-tested: they decide how ~37k peak names read.
//
// ⚠️ There is no single "romanize Cyrillic" answer — the correct output depends
// on the LANGUAGE, not the script. Серб. `Хвосно` is `Hvosno` (Gaj's Latin is
// co-official, so it is a spelling, not a transcription), while Rus. `Ходжа` is
// `Khodzha` (BGN/PCGN). A single table gets one of the two wrong. Hence the
// per-country profile below.

import { transliterate } from "transliteration";
import { pinyin } from "pinyin-pro";
import { romanize as krRomanize } from "es-hangul";

const HANGUL = /[가-힯]/;
const HAN = /[㐀-鿿豈-﫿]/;
const CYRILLIC = /[Ѐ-ӿ]/;
const NON_WESTERN =
  /[Ͱ-ϿЀ-ӿ԰-֏֐-׿؀-ۿऀ-ॿ฀-๿Ⴀ-ჿሀ-፿぀-ヿ㐀-鿿가-힯豈-﫿]/;

// ─── Cyrillic profiles ───────────────────────────────────────────────────────
//
// The `transliteration` package romanizes Cyrillic with х→h and ц→c. That is
// right for Serbian/Macedonian/Bosnian and wrong for Russian, which is why the
// only overrides here are those two letters — every other letter the package
// already matches the relevant standard.

export type CyrillicProfile = "ru" | "bg" | "sh";

const PROFILE_OVERRIDES: Record<CyrillicProfile, Record<string, string>> = {
  // BGN/PCGN 1947 — the convention GeoNames, USGS and OSM's own `name:en` use
  // for Russian and for the Cyrillic-written languages that borrowed its rules.
  ru: { х: "kh", Х: "Kh", ц: "ts", Ц: "Ts" },
  // Bulgarian Transliteration Act (2009): х→h but ц→ts.
  bg: { ц: "ts", Ц: "Ts" },
  // Gaj's Latin alphabet (Serbian, Macedonian, Bosnian, Montenegrin): the
  // package's defaults are already correct, so nothing to override.
  sh: {},
};

// Country → profile. Only countries whose peaks actually carry Cyrillic names
// are listed; anything else falls back to the package default, which is what
// every non-Cyrillic script uses anyway.
const COUNTRY_PROFILE: Record<string, CyrillicProfile> = {
  RU: "ru", UA: "ru", BY: "ru", MD: "ru",
  KZ: "ru", KG: "ru", TJ: "ru", UZ: "ru", TM: "ru",
  MN: "ru",
  // In the Caucasus a Cyrillic peak name is a Russian one — the local scripts
  // (Georgian, Armenian) are not Cyrillic and take the package default.
  GE: "ru", AM: "ru", AZ: "ru",
  BG: "bg",
  RS: "sh", MK: "sh", BA: "sh", ME: "sh", HR: "sh", XK: "sh",
};

export function cyrillicProfileFor(country?: string | null): CyrillicProfile | null {
  if (!country) return null;
  return COUNTRY_PROFILE[country.toUpperCase()] ?? null;
}

function isInitialism(token: string): boolean {
  return token.length >= 2 && /^[\p{Lu}]+$/u.test(token);
}

function titleCase(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Romanize a peak name. `country` selects the Cyrillic convention; without it
 * (or for a country we have no profile for) the package default is used, which
 * is the Gaj/Serbian reading of Cyrillic.
 */
export function romanizePeak(name: string, country?: string | null): string {
  let r: string;
  if (HANGUL.test(name)) {
    r = krRomanize(name);
  } else if (HAN.test(name)) {
    r = pinyin(name, { toneType: "none", type: "array" }).join(" ");
  } else {
    let src = name;
    const profile = CYRILLIC.test(name) ? cyrillicProfileFor(country) : null;
    if (profile) {
      const overrides = PROFILE_OVERRIDES[profile];
      // Applied BEFORE the package sees the string: it maps these to a single
      // Latin letter, so patching its output would need re-deriving which `h`
      // came from `х` and which from `ҳ`.
      if (Object.keys(overrides).length > 0) {
        src = src
          .split(/(\s+)/)
          // An all-caps token is an initialism (ЦСКА), not a name. BGN/PCGN is a
          // rule for names: expanding ц→ts there gives "TsSKA" instead of "CSKA".
          .map((tok) => (isInitialism(tok) ? tok : tok.replace(/./gu, (ch) => overrides[ch] ?? ch)))
          .join("");
      }
    }
    r = transliterate(src);
  }
  if (NON_WESTERN.test(r)) r = transliterate(r); // residual kana / mixed scripts
  return titleCase(r);
}
