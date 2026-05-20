import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LANDING_PEAKS, slugifyPeak, getPeakBySlug, rarityForAlt } from "@/lib/data/landing-peaks";
import { getPeakPageT } from "@/lib/i18n/peaks";
import { PeakPageContent } from "@/app/peaks/[slug]/PeakPageContent";

const BASE = "https://www.peakadex.com";
const t = getPeakPageT("en");

export function generateStaticParams() {
  return LANDING_PEAKS.map((p) => ({ slug: slugifyPeak(p.peakName) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const peak = getPeakBySlug(slug);
  if (!peak) return {};

  const rarity = rarityForAlt(peak.altitudeM);
  const url = `${BASE}/en/peaks/${slug}`;
  const title = t.meta_title(peak);
  const description = t.meta_desc(peak, rarity.name);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "x-default": url,
        es:  `${BASE}/peaks/${slug}`,
        en:  url,
        fr:  `${BASE}/fr/peaks/${slug}`,
        de:  `${BASE}/de/peaks/${slug}`,
        ca:  `${BASE}/ca/peaks/${slug}`,
      },
    },
    openGraph: { type: "website", url, title, description, locale: "en_US" },
  };
}

export default async function PeakPageEn({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const peak = getPeakBySlug(slug);
  if (!peak) notFound();

  return <PeakPageContent peak={peak} slug={slug} t={t} />;
}
