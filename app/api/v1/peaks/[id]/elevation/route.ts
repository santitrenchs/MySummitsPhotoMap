import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";
import { fetchElevationProfile, type ElevationProfile } from "@/lib/services/elevation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const peak = await prisma.peak.findUnique({
    where: { id },
    select: { id: true, latitude: true, longitude: true, elevationProfile: true },
  });

  if (!peak) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Return cached profile if available
  if (peak.elevationProfile) {
    return NextResponse.json({ profile: peak.elevationProfile as ElevationProfile });
  }

  // Calculate on demand and cache
  try {
    const profile = await fetchElevationProfile(peak.latitude, peak.longitude);

    await prisma.peak.update({
      where: { id },
      data: { elevationProfile: profile as object },
    });

    return NextResponse.json({ profile });
  } catch (err) {
    console.error(`[v1 elevation] Failed for peak ${id}:`, err);
    return NextResponse.json({ error: "Failed to fetch elevation data" }, { status: 502 });
  }
}
