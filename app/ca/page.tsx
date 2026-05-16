import LandingPage from "@/components/landing/LandingPage";
import { getLandingStats } from "@/lib/services/landing.service";
import { getLandingT } from "@/lib/i18n/landing";
import type { Metadata } from "next";

export const revalidate = 3600;

const t = getLandingT("ca");

export const metadata: Metadata = {
  title: t.meta_title,
  description: t.meta_desc,
  openGraph: {
    title: t.meta_title,
    description: t.meta_desc,
    type: "website",
  },
  alternates: {
    canonical: "https://www.peakadex.com/ca",
    languages: {
      "x-default": "https://www.peakadex.com",
      "es": "https://www.peakadex.com",
      "en": "https://www.peakadex.com/en",
      "fr": "https://www.peakadex.com/fr",
      "de": "https://www.peakadex.com/de",
      "ca": "https://www.peakadex.com/ca",
    },
  },
};

export default async function CaPage() {
  const { stats, peakCounts } = await getLandingStats();
  return <LandingPage stats={stats} peakCounts={peakCounts} locale="ca" />;
}
