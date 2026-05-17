import { cookies } from "next/headers";
import type { Locale } from "./types";
import { isValidLocale, getT } from "./index";
import type { Dict } from "./types";

/** Used by app pages — respects the in-app language switcher first. */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const val = store.get("locale")?.value ?? "";
    if (isValidLocale(val)) return val;
    const pdx = store.get("pdx_locale")?.value ?? "";
    if (isValidLocale(pdx)) return pdx;
  } catch {}
  return "en";
}

/**
 * Used by auth pages (login, register, accept-terms).
 * Prioritizes pdx_locale (landing language) over locale (in-app switcher)
 * so the form always matches the language the user came from.
 */
export async function getAuthLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const pdx = store.get("pdx_locale")?.value ?? "";
    if (isValidLocale(pdx)) return pdx;
    const val = store.get("locale")?.value ?? "";
    if (isValidLocale(val)) return val;
  } catch {}
  return "en";
}

export async function getServerT(): Promise<Dict> {
  return getT(await getLocale());
}
