import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getAscentedPeakIds } from "@/lib/services/ascent.service";
import MapContainer from "@/components/map/MapContainer";

export default async function MapPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [peaks, ascentedPeakIds] = await Promise.all([
    prisma.peak.findMany({
      orderBy: { altitudeM: "desc" },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        altitudeM: true,
        mountainRange: true,
        country: true,
      },
    }),
    getAscentedPeakIds(session.user.tenantId),
  ]);

  return <MapContainer peaks={peaks} ascentedPeakIds={ascentedPeakIds} />;
}
