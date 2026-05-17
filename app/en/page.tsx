import LandingPage from "@/components/landing/LandingPage";
import { getLandingStats } from "@/lib/services/landing.service";
import { getLandingT } from "@/lib/i18n/landing";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const t = getLandingT("en");

const HREFLANG = {
  "x-default": "https://www.peakadex.com",
  es: "https://www.peakadex.com",
  en: "https://www.peakadex.com/en",
  fr: "https://www.peakadex.com/fr",
  de: "https://www.peakadex.com/de",
  ca: "https://www.peakadex.com/ca",
};

export const metadata: Metadata = {
  title: t.meta_title,
  description: t.meta_desc,
  openGraph: {
    title: t.meta_title,
    description: t.meta_desc,
    type: "website",
    url: "https://www.peakadex.com/en",
    siteName: "Peakadex",
    locale: "en_US",
    alternateLocale: ["es_ES", "fr_FR", "de_DE", "ca_ES"],
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Peakadex" }],
  },
  twitter: {
    card: "summary_large_image",
    title: t.meta_title,
    description: t.meta_desc,
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "https://www.peakadex.com/en",
    languages: HREFLANG,
  },
};

export default async function EnPage() {
  const { stats, peakCounts } = await getLandingStats();
  return <LandingPage stats={stats} peakCounts={peakCounts} locale="en" />;
}
