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

  const q = searchParams.get("q")?.trim() ?? "";

  let where: Record<string, unknown> | undefined;
  let take: number | undefined;

  if (q.length >= 2) {
    where = {
      OR: [
        { name:          { contains: q, mode: "insensitive" } },
        { mountainRange: { contains: q, mode: "insensitive" } },
      ],
    };
    take = 10;
  } else if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
    where = {
      latitude:  { gte: south, lte: north },
      longitude: { gte: west,  lte: east  },
    };
    take = 600;
  } else if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
    where = {
      latitude:  { gte: lat - radius, lte: lat + radius },
      longitude: { gte: lng - radius, lte: lng + radius },
    };
    take = 600;
  }

  const peaks = await prisma.peak.findMany({
    where,
    orderBy: { altitudeM: "desc" },
    ...(take ? { take } : {}),
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
