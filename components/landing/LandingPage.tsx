// Server Component — no "use client" directive
// Landing-specific fonts are loaded here so they don't bloat the root layout
// (Inter + Space_Grotesk remain in app/layout.tsx for authenticated pages)
import { Baloo_2, Nunito, Manrope, JetBrains_Mono } from "next/font/google";
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

const baloo2 = Baloo_2({ subsets: ["latin"], weight: ["800"], variable: "--font-baloo2", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-nunito", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["800"], variable: "--font-manrope", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-landing", display: "swap" });

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
  // Font variables are scoped to the landing root div — no effect outside landing pages
  const fontClasses = `${baloo2.variable} ${nunito.variable} ${manrope.variable} ${jetbrainsMono.variable}`;
  return (
    <LandingTProvider value={t}>
      <div className={`ld-root ${fontClasses}`}>
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
