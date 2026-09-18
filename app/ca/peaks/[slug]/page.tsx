import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LANDING_PEAKS, slugifyPeak, getPeakBySlug, rarityForAlt } from "@/lib/data/landing-peaks";
import { getPeakPageT } from "@/lib/i18n/peaks";
import { PeakPageContent } from "@/app/peaks/[slug]/PeakPageContent";

const BASE = "https://www.peakadex.com";
const t = getPeakPageT("ca");

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
  const url = `${BASE}/ca/peaks/${slug}`;
  const title = t.meta_title(peak);
  const description = t.meta_desc(peak, rarity.name);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "x-default": `${BASE}/en/peaks/${slug}`,
        es:  `${BASE}/peaks/${slug}`,
        en:  `${BASE}/en/peaks/${slug}`,
        fr:  `${BASE}/fr/peaks/${slug}`,
        de:  `${BASE}/de/peaks/${slug}`,
        ca:  url,
      },
    },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      locale: "ca_ES",
      // The peak photo itself. Portrait (≈430×600), so it is cropped on the
      // social cards — a proper 1200×630 card is still pending.
      images: peak.photo ? [{ url: `${BASE}${peak.photo}`, alt: peak.peakName }] : undefined,
    },
    twitter: {
      card: peak.photo ? "summary_large_image" : "summary",
      title,
      description,
      images: peak.photo ? [`${BASE}${peak.photo}`] : undefined,
    },
  };
}

export default async function PeakPageCa({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const peak = getPeakBySlug(slug);
  if (!peak) notFound();

  return <PeakPageContent peak={peak} slug={slug} t={t} />;
}
