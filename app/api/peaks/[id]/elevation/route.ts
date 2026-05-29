import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { fetchElevationProfile, type ElevationProfile } from "@/lib/services/elevation.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const peak = await prisma.peak.findUnique({
    where: { id },
    select: { id: true, latitude: true, longitude: true, elevationProfile: true },
  });

  if (!peak) {
    return NextResponse.json({ error: "Peak not found" }, { status: 404 });
  }

  // Return cached profile if available
  if (peak.elevationProfile) {
    return NextResponse.json({ profile: peak.elevationProfile as ElevationProfile });
  }

  // Calculate and cache
  try {
    const profile = await fetchElevationProfile(peak.latitude, peak.longitude);

    await prisma.peak.update({
      where: { id },
      data: { elevationProfile: profile as object },
    });

    return NextResponse.json({ profile });
  } catch (err) {
    console.error(`[elevation] Failed for peak ${id}:`, err);
    return NextResponse.json({ error: "Failed to fetch elevation data" }, { status: 502 });
  }
}
