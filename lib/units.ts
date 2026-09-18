// ─── Units ───────────────────────────────────────────────────────────────────
//
// Every altitude and distance the app prints goes through here. Before this
// module the "m" was hand-written at ~35 places on web and ~30 on Android, some
// grouping the thousands and some not, which is why the same peak read "3404 m"
// on a card and "3.404 m" on its SEO page.
//
// The `units` argument is the whole point: there is no user preference yet, so
// every caller gets metric. When the preference lands, it is threaded into these
// two functions instead of into 65 call sites.
//
// ⚠️ Altitude is not only a display value in this app: the rarity tiers
// (`lib/rarity.ts`) and the level requirements (`lib/level-utils.ts`) are
// DEFINED in metres, and so is the identity of several challenges. Converting a
// tier boundary for display gives "Tundra: 9,843 ft+", which is not a boundary
// anyone recognises. Those need a product decision, not this function.

export type Units = "metric" | "imperial";

export const DEFAULT_UNITS: Units = "metric";

const FEET_PER_METRE = 3.28084;
const MILES_PER_KM = 0.621371;

export function metresToFeet(m: number): number {
  return Math.round(m * FEET_PER_METRE);
}

type AltitudeOpts = {
  units?: Units;
  /**
   * Explicit BCP-47 locale to group the thousands with. Omit to print the bare
   * digits. Never let this default to the ambient locale: `toLocaleString()`
   * with no argument resolves differently on the Node server and in the
   * browser, which is a hydration mismatch.
   */
  locale?: string;
  /**
   * `"always"` forces a thousands separator even where CLDR omits it for
   * four-digit numbers (Spanish and German print "4808", not "4.808").
   */
  grouping?: "auto" | "always";
};

/**
 * "3404 m" · "3.404 m" (locale "es-ES") · "11168 ft" (imperial).
 *
 * Feet are rounded to the unit: a peak's height is a survey figure, and
 * "11167.9 ft" claims a precision the metric source does not have.
 */
export function formatAltitude(altitudeM: number, opts: AltitudeOpts = {}): string {
  return `${altitudeValue(altitudeM, opts)} ${altitudeUnit(opts.units)}`;
}

/** Just the number — for the few places that render value and unit separately. */
export function altitudeValue(altitudeM: number, opts: AltitudeOpts = {}): string {
  const { units = DEFAULT_UNITS, locale, grouping = "auto" } = opts;
  const value = units === "imperial" ? metresToFeet(altitudeM) : altitudeM;
  return locale
    ? value.toLocaleString(locale, grouping === "always" ? { useGrouping: "always" } : undefined)
    : String(value);
}

export function altitudeUnit(units: Units = DEFAULT_UNITS): "m" | "ft" {
  return units === "imperial" ? "ft" : "m";
}

/**
 * "850 m" / "12 km" — the short form used for "how far is this peak from here".
 * Under a kilometre it switches to metres (feet in imperial) rather than
 * printing "0.8 km".
 */
/** One decimal under 10, none above — and never a bare ".0", which reads as
 *  false precision on an axis label that used to say "8 km". */
function oneDecimal(n: number): string {
  if (n >= 10) return String(Math.round(n));
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function formatDistance(km: number, opts: { units?: Units } = {}): string {
  const { units = DEFAULT_UNITS } = opts;
  if (units === "imperial") {
    const miles = km * MILES_PER_KM;
    if (miles < 1) return `${metresToFeet(km * 1000)} ft`;
    return `${oneDecimal(miles)} mi`;
  }
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${oneDecimal(km)} km`;
}
