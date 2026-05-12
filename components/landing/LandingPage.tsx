"use client";

import "./landing.css";
import LandingNav from "./LandingNav";
import LandingHero from "./LandingHero";
import LandingStats from "./LandingStats";
import LandingRarities from "./LandingRarities";
import LandingMythic from "./LandingMythic";
import LandingCards from "./LandingCards";
import LandingHowItWorks from "./LandingHowItWorks";
import LandingFAQ from "./LandingFAQ";
import LandingCTA from "./LandingCTA";
import LandingFooter from "./LandingFooter";

type Stats = {
  totalRarities: number;
  totalPeaks: number;
  capturedPeaks: number;
  totalAscents: number;
};

export default function LandingPage({
  stats,
  peakCounts,
}: {
  stats: Stats;
  peakCounts: Record<string, number>;
}) {
  return (
    <div className="ld-root">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingStats stats={stats} />
        <LandingRarities peakCounts={peakCounts} />
        <LandingCards />
        <LandingMythic />
        <LandingHowItWorks />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
