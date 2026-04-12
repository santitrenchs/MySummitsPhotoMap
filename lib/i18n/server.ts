import { cookies } from "next/headers";
import type { Locale } from "./types";
import { isValidLocale, getT } from "./index";
import type { Dict } from "./types";

export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const val = store.get("locale")?.value ?? "";
    if (isValidLocale(val)) return val;
  } catch {}
  return "en";
}

export async function getServerT(): Promise<Dict> {
  return getT(await getLocale());
}
