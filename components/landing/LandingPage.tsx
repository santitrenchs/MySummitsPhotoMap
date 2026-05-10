"use client";

import "./landing.css";
import LandingNav from "./LandingNav";
import LandingHero from "./LandingHero";
import LandingRarities from "./LandingRarities";
import LandingCards from "./LandingCards";
import LandingHowItWorks from "./LandingHowItWorks";
import LandingFAQ from "./LandingFAQ";
import LandingCTA from "./LandingCTA";
import LandingFooter from "./LandingFooter";

export default function LandingPage() {
  return (
    <div className="ld-root">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingRarities />
        <LandingCards />
        <LandingHowItWorks />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
