import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q      = searchParams.get("q")?.trim() ?? "";
  const north  = parseFloat(searchParams.get("north") ?? "");
  const south  = parseFloat(searchParams.get("south") ?? "");
  const east   = parseFloat(searchParams.get("east")  ?? "");
  const west   = parseFloat(searchParams.get("west")  ?? "");

  let where: Record<string, unknown> | undefined;
  let take: number | undefined;

  if (q.length >= 2) {
    where = {
      OR: [
        { name:          { contains: q, mode: "insensitive" } },
        { mountainRange: { contains: q, mode: "insensitive" } },
      ],
    };
    take = 20;
  } else if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
    where = {
      latitude:  { gte: south, lte: north },
      longitude: { gte: west,  lte: east  },
    };
    take = 300;
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
    },
  });

  return NextResponse.json({ peaks });
}
