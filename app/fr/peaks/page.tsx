import type { Metadata } from "next";
import { getPeakIndexT } from "@/lib/i18n/peaks";
import { PeaksIndexContent } from "@/app/peaks/PeaksIndexContent";

const BASE = "https://www.peakadex.com";
const t = getPeakIndexT("fr");

export const metadata: Metadata = {
  title: t.meta_title,
  description: t.meta_desc,
  alternates: {
    canonical: `${BASE}/fr/peaks`,
    languages: {
      "x-default": `${BASE}/en/peaks`,
      es: `${BASE}/peaks`,
      en: `${BASE}/en/peaks`,
      fr: `${BASE}/fr/peaks`,
      de: `${BASE}/de/peaks`,
      ca: `${BASE}/ca/peaks`,
    },
  },
  openGraph: {
    type: "website",
    url: `${BASE}/fr/peaks`,
    title: t.meta_title,
    description: t.meta_desc,
    siteName: "Peakadex",
    locale: "fr_FR",
  },
};

export default function PeaksIndexFr() {
  return <PeaksIndexContent t={t} />;
}
