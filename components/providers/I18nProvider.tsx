"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { Locale, Dict } from "@/lib/i18n/types";
import { getT } from "@/lib/i18n";
import { DEFAULT_UNITS, type Units } from "@/lib/units";

export type UnitOpts = { units: Units; locale: string };

type I18nCtx = {
  locale: Locale;
  t: Dict;
  setLocale: (locale: Locale) => void;
  units: Units;
  setUnits: (units: Units) => void;
  /** Ready to spread into `formatAltitude` / `altitudeValue`. */
  unitOpts: UnitOpts;
};

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({
  initialLocale,
  initialUnits = DEFAULT_UNITS,
  children,
}: {
  initialLocale: Locale;
  initialUnits?: Units;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [t, setT] = useState<Dict>(() => getT(initialLocale));
  const [units, setUnits] = useState<Units>(initialUnits);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setT(getT(newLocale));
  }, []);

  // The locale doubles as the grouping locale for numbers, so both settings
  // arrive at the formatter as one object and call sites stay a single argument.
  const unitOpts = useMemo<UnitOpts>(() => ({ units, locale }), [units, locale]);

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, units, setUnits, unitOpts }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/** Shorthand — most components only need the dict */
export function useT(): Dict {
  return useI18n().t;
}

/**
 * The options every altitude/distance in a client component is formatted with:
 * `formatAltitude(peak.altitudeM, useUnitOpts())`.
 */
export function useUnitOpts(): UnitOpts {
  return useI18n().unitOpts;
}
