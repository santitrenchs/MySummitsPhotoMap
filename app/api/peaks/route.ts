import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Viewport bounds (preferred)
  const north = parseFloat(searchParams.get("north") ?? "");
  const south = parseFloat(searchParams.get("south") ?? "");
  const east  = parseFloat(searchParams.get("east")  ?? "");
  const west  = parseFloat(searchParams.get("west")  ?? "");

  // Legacy lat/lng/radius (kept for backwards compat)
  const lat    = parseFloat(searchParams.get("lat")    ?? "");
  const lng    = parseFloat(searchParams.get("lng")    ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "");

  let where: Record<string, unknown> | undefined;
  if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
    where = {
      latitude:  { gte: south, lte: north },
      longitude: { gte: west,  lte: east  },
    };
  } else if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
    where = {
      latitude:  { gte: lat - radius, lte: lat + radius },
      longitude: { gte: lng - radius, lte: lng + radius },
    };
  }

  const peaks = await prisma.peak.findMany({
    where,
    orderBy: { altitudeM: "desc" },
    // Limit only when a geo filter is active — unbounded queries (e.g. modal peak picker) need all peaks
    ...(where ? { take: 600 } : {}),
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
  });

  return NextResponse.json(peaks);
}
