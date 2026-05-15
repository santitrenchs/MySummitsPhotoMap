"use client";

import "./landing.css";
import LandingNav from "./LandingNav";
import LandingHero from "./LandingHero";
import LandingStats from "./LandingStats";
import LandingRarities from "./LandingRarities";
import LandingMythic from "./LandingMythic";
import LandingProgression from "./LandingProgression";
import LandingCards from "./LandingCards";
import LandingFAQ from "./LandingFAQ";
import LandingCTA from "./LandingCTA";
import LandingFooter from "./LandingFooter";
import { LandingTProvider } from "./LandingLocaleContext";
import { getLandingT } from "@/lib/i18n/landing";
import type { LandingLocale } from "@/lib/i18n/landing";

type Stats = {
  totalRarities: number;
  totalPeaks: number;
  capturedPeaks: number;
  totalAscents: number;
};

export default function LandingPage({
  stats,
  peakCounts,
  locale = "es",
}: {
  stats: Stats;
  peakCounts: Record<string, number>;
  locale?: LandingLocale;
}) {
  const t = getLandingT(locale);
  return (
    <LandingTProvider value={t}>
      <div className="ld-root">
        <LandingNav />
        <main>
          <LandingHero />
          <LandingStats stats={stats} />
          <LandingRarities peakCounts={peakCounts} />
          <LandingCards />
          <LandingMythic />
          <LandingProgression />
          <LandingFAQ />
          <LandingCTA />
        </main>
        <LandingFooter />
      </div>
    </LandingTProvider>
  );
}
