import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getAscentMapData } from "@/lib/services/ascent.service";
import MapContainer from "@/components/map/MapContainer";

export default async function MapPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [ascentData, rarities] = await Promise.all([
    getAscentMapData(session.user.tenantId),
    prisma.rarity.findMany({ orderBy: { order: "asc" } }),
  ]);

  // Only fetch the user's climbed peaks — unclimbed peaks load client-side per viewport
  const climbedPeakIds = ascentData.map((a) => a.peakId);
  const climbedPeaks = climbedPeakIds.length > 0
    ? await prisma.peak.findMany({
        where: { id: { in: climbedPeakIds } },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          altitudeM: true,
          mountainRange: true,
          country: true,
          rarityId: true,
          isMythic: true,
          rarity: { select: { id: true, name: true, emoji: true, order: true } },
        },
      })
    : [];

  return <MapContainer peaks={climbedPeaks} ascentData={ascentData} rarities={rarities} />;
}
