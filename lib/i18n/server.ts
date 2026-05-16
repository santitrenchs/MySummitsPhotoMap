import { cookies } from "next/headers";
import type { Locale } from "./types";
import { isValidLocale, getT } from "./index";
import type { Dict } from "./types";

export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    // App locale cookie (set by the in-app language switcher)
    const val = store.get("locale")?.value ?? "";
    if (isValidLocale(val)) return val;
    // Fall back to landing locale cookie (set by the landing page auto-detection)
    const pdx = store.get("pdx_locale")?.value ?? "";
    if (isValidLocale(pdx)) return pdx;
  } catch {}
  return "en";
}

export async function getServerT(): Promise<Dict> {
  return getT(await getLocale());
}
