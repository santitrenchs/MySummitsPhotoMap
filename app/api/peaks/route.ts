import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "");

  const where =
    !isNaN(lat) && !isNaN(lng) && !isNaN(radius)
      ? {
          latitude:  { gte: lat - radius, lte: lat + radius },
          longitude: { gte: lng - radius, lte: lng + radius },
        }
      : undefined;

  const peaks = await prisma.peak.findMany({
    where,
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
  });

  return NextResponse.json(peaks);
}
