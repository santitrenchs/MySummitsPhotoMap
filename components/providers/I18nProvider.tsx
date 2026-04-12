"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { Locale, Dict } from "@/lib/i18n/types";
import { getT } from "@/lib/i18n";

type I18nCtx = {
  locale: Locale;
  t: Dict;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [t, setT] = useState<Dict>(() => getT(initialLocale));

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setT(getT(newLocale));
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
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
