/**
 * Bitácora tab identifiers.
 *
 * Deliberately NOT a "use client" module: the server page reads `?tab=` and validates it
 * with `isBitacoraTab` before passing it down. A function exported from a client module
 * cannot be called on the server — it fails at runtime, not at build.
 */

export const BITACORA_TABS = ["peaks", "challenges", "photos", "tagged"] as const;
export type BitacoraTab = (typeof BITACORA_TABS)[number];

export function isBitacoraTab(v: string | undefined): v is BitacoraTab {
  return !!v && (BITACORA_TABS as readonly string[]).includes(v);
}
