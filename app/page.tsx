import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { RARITIES } from "@/lib/rarity";
import LandingPage from "@/components/landing/LandingPage";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Peakadex — Captura cimas. Colecciona rarezas. Conviértete en Legendario.",
  description:
    "La app de montaña que convierte cada ascensión en una carta coleccionable. Registra tus cimas, desbloquea rarezas según la altitud y compite con tu cordada. Gratis.",
  openGraph: {
    title: "Peakadex — Captura cimas. Colecciona rarezas.",
    description: "Convierte cada ascensión en una carta coleccionable.",
    type: "website",
  },
};

export default async function RootPage() {
  const session = await auth();
  if (session) redirect("/home");

  const [totalPeaks, capturedPeaks, totalAscents, ...rarityCounts] = await Promise.all([
    prisma.peak.count(),
    prisma.ascent.groupBy({ by: ["peakId"] }).then((r) => r.length),
    prisma.ascent.count(),
    // One COUNT per rarity tier, using altitude ranges (no dependency on rarityId column)
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
    />
  );
}
