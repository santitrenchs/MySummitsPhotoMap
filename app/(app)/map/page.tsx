import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getAscentMapData } from "@/lib/services/ascent.service";
import MapContainer from "@/components/map/MapContainer";

export default async function MapPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [peaks, ascentData] = await Promise.all([
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
    getAscentMapData(session.user.tenantId),
  ]);

  return <MapContainer peaks={peaks} ascentData={ascentData} />;
}
