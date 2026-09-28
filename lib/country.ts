/**
 * The user's country — `User.country`, an ISO 3166-1 alpha-2 code or null.
 *
 * Private and optional. It is inferred once, at sign-up, from the locale the
 * browser or phone reports, and the user can change it in Settings. Today it
 * only decides where the Atlas opens for someone with no ascents yet.
 *
 * Android mirror: `core/util/Country.kt`. Keep the bounds table in sync.
 */

/** Every ISO 3166-1 alpha-2 code. The only values `User.country` may hold. */
export const COUNTRY_CODES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS",
  "BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN",
  "CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE",
  "EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF",
  "GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM",
  "HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM",
  "JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC",
  "LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK",
  "ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA",
  "NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG",
  "PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS",
  "ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO",
  "TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI",
  "VN","VU","WF","WS","XK","YE","YT","ZA","ZM","ZW",
] as const;

const CODE_SET = new Set<string>(COUNTRY_CODES);

/** A valid, upper-cased code, or null. Anything else from a client is dropped. */
export function normalizeCountry(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return CODE_SET.has(code) ? code : null;
}

/**
 * The region of the FIRST, highest-priority locale tag, or null.
 *
 * `"es-ES,es;q=0.9,en-US;q=0.8"` → `"ES"`, but `"es,en-US;q=0.8"` → null: the
 * user's main language carries no region, and borrowing one from a fallback
 * language would label a Spaniard as American. Numeric regions (`es-419`,
 * "Latin America") are not countries and give null too. Accepts both a raw
 * `Accept-Language` header and a single BCP 47 tag (`navigator.language`,
 * Android's `es_ES` with an underscore).
 */
export function countryFromLocale(header: string | null | undefined): string | null {
  if (!header) return null;
  const first = header.split(",")[0]?.split(";")[0]?.trim().replace(/_/g, "-");
  if (!first) return null;
  // Skip a script subtag: zh-Hant-TW → TW.
  const region = first.split("-").slice(1).find((part) => /^[A-Za-z]{2}$/.test(part));
  return normalizeCountry(region);
}

/**
 * The country to store at sign-up. An explicit value from the form wins, and
 * that includes an explicit null ("not specified" — the user cleared it). Only
 * when the client sent nothing at all do we fall back to the request's locale:
 * that is the Google path, which has no form.
 */
export function resolveSignupCountry(
  body: Record<string, unknown>,
  acceptLanguage: string | null | undefined,
): string | null {
  if ("country" in body) return normalizeCountry(body.country);
  return countryFromLocale(acceptLanguage);
}

/**
 * Countries to list first when none was detected, keyed by app language — so a
 * Spanish speaker whose browser only says "es" finds their country at the top.
 */
export const SUGGESTED_COUNTRIES: Record<string, string[]> = {
  es: ["ES", "MX", "AR", "CO", "CL", "PE"],
  ca: ["ES", "AD", "FR"],
  en: ["GB", "US", "IE", "CA", "AU", "NZ"],
  fr: ["FR", "BE", "CH", "CA"],
  de: ["DE", "AT", "CH"],
};

/**
 * `[west, south, east, north]` of each country's MAIN territory, for framing a
 * map with `fitBounds`. Deliberately not the official extent: Spain without the
 * Canaries, France without its overseas departments, the US without Alaska and
 * Hawaii. The official box would open on a map mostly made of ocean.
 *
 * Countries that are missing (or that straddle the antimeridian, like Russia)
 * return null and the caller keeps its own fallback.
 */
const COUNTRY_BOUNDS: Record<string, [number, number, number, number]> = {
  // Europe
  AD: [1.40, 42.43, 1.79, 42.66],
  AT: [9.53, 46.37, 17.16, 49.02],
  BE: [2.54, 49.50, 6.41, 51.51],
  CH: [5.95, 45.82, 10.49, 47.81],
  CZ: [12.09, 48.55, 18.86, 51.06],
  DE: [5.87, 47.27, 15.04, 55.06],
  ES: [-9.39, 35.95, 4.33, 43.79],
  FI: [20.55, 59.81, 31.59, 70.09],
  FR: [-5.14, 41.33, 9.56, 51.09],
  GB: [-8.18, 49.87, 1.77, 60.86],
  GR: [19.37, 34.80, 28.25, 41.75],
  HR: [13.49, 42.39, 19.45, 46.55],
  IE: [-10.48, 51.42, -5.99, 55.39],
  IS: [-24.55, 63.29, -13.49, 66.57],
  IT: [6.63, 36.62, 18.52, 47.09],
  NL: [3.36, 50.75, 7.23, 53.56],
  NO: [4.64, 57.96, 31.08, 71.19],
  PL: [14.12, 49.00, 24.15, 54.84],
  PT: [-9.53, 36.96, -6.19, 42.15],
  RO: [20.26, 43.62, 29.69, 48.27],
  SE: [11.11, 55.34, 24.17, 69.06],
  SI: [13.38, 45.42, 16.61, 46.88],
  SK: [16.83, 47.73, 22.56, 49.61],
  // Americas
  AR: [-73.56, -55.06, -53.64, -21.78],
  BO: [-69.64, -22.90, -57.45, -9.68],
  CA: [-141.00, 41.68, -52.62, 70.00],
  CL: [-75.70, -55.92, -66.42, -17.50],
  CO: [-79.00, -4.23, -66.87, 12.46],
  EC: [-81.08, -5.01, -75.19, 1.45],
  MX: [-117.13, 14.53, -86.71, 32.72],
  PE: [-81.33, -18.35, -68.65, -0.04],
  US: [-124.85, 24.40, -66.88, 49.38],
  // Asia and the Caucasus
  AM: [43.45, 38.84, 46.63, 41.30],
  CN: [73.50, 18.16, 134.77, 53.56],
  GE: [40.01, 41.05, 46.72, 43.59],
  IN: [68.11, 6.75, 97.40, 35.50],
  JP: [129.41, 31.03, 145.54, 45.55],
  KG: [69.28, 39.17, 80.28, 43.27],
  KZ: [46.49, 40.57, 87.36, 55.44],
  NP: [80.06, 26.35, 88.20, 30.45],
  PK: [60.87, 23.69, 77.84, 37.10],
  TJ: [67.39, 36.67, 75.15, 41.04],
  TR: [25.98, 35.82, 44.82, 42.11],
  UZ: [55.99, 37.18, 73.13, 45.59],
  // Africa and Oceania
  AU: [113.34, -43.64, 153.57, -10.67],
  KE: [33.91, -4.68, 41.90, 5.02],
  MA: [-13.17, 27.66, -1.01, 35.92],
  NZ: [166.43, -47.29, 178.55, -34.39],
  TZ: [29.33, -11.75, 40.44, -0.99],
  ZA: [16.45, -34.84, 32.89, -22.13],
};

export function countryBounds(code: string | null | undefined): [number, number, number, number] | null {
  if (!code) return null;
  return COUNTRY_BOUNDS[code.toUpperCase()] ?? null;
}

/** Localized country name via ICU. Falls back to the code on old runtimes. */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
