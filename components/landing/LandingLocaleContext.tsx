"use client";

import { createContext, useContext } from "react";
import { getLandingT } from "@/lib/i18n/landing";
import type { LandingT } from "@/lib/i18n/landing";

const LandingTContext = createContext<LandingT>(getLandingT("es"));

export const LandingTProvider = LandingTContext.Provider;

export function useLandingT(): LandingT {
  return useContext(LandingTContext);
}
