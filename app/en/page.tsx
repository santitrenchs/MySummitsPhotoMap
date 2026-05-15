import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { RARITIES } from "@/lib/rarity";
import LandingPage from "@/components/landing/LandingPage";
import { getLandingT } from "@/lib/i18n/landing";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const t = getLandingT("en");

export const metadata: Metadata = {
  title: t.meta_title,
  description: t.meta_desc,
  openGraph: {
    title: t.meta_title,
    description: t.meta_desc,
    type: "website",
  },
  alternates: {
    canonical: "https://www.peakadex.com/en",
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

export default async function EnPage() {
  const session = await auth();
  if (session) redirect("/home");

  const [totalPeaks, capturedPeaks, totalAscents, ...rarityCounts] = await Promise.all([
    prisma.peak.count(),
    prisma.ascent.groupBy({ by: ["peakId"] }).then((r) => r.length),
    prisma.ascent.count(),
    ...RARITIES.map((r, i) => {
      const next = RARITIES[i + 1];
      return prisma.peak.count({
        where: { altitudeM: { gte: r.minAlt, ...(next ? { lt: next.minAlt } : {}) } },
      });
    }),
  ]);

  const peakCounts = Object.fromEntries(
    RARITIES.map((r, i) => [r.id, rarityCounts[i]])
  ) as Record<string, number>;

  return (
    <LandingPage
      stats={{ totalRarities: 9, totalPeaks, capturedPeaks, totalAscents }}
      peakCounts={peakCounts}
      locale="en"
    />
  );
}
