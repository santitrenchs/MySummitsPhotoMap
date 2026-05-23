import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { getAscentMapData } from "@/lib/services/ascent.service";
import { prisma } from "@/lib/db/client";

// GET /api/v1/map/ascents
// Returns the user's climbed peaks with their most-recent ascent photo and metadata.
// Used by Android/iOS to paint the photo-circle markers on the Atlas map.
export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ascentData = await getAscentMapData(session.tenantId);

  if (ascentData.length === 0) {
    return NextResponse.json({ ascents: [] });
  }

  const peakIds = ascentData.map((a) => a.peakId);
  const peaks = await prisma.peak.findMany({
    where: { id: { in: peakIds } },
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

  const peakById = new Map(peaks.map((p) => [p.id, p]));

  const ascents = ascentData.flatMap((a) => {
    const peak = peakById.get(a.peakId);
    if (!peak) return [];
    return [{
      peakId:       a.peakId,
      ascentId:     a.ascentId,
      photoUrl:     a.photoUrl,
      date:         a.date,
      route:        a.route,
      ascentCount:  a.ascentCount,
      faceCenterX:  a.faceCenterX,
      faceCenterY:  a.faceCenterY,
      peak,
    }];
  });

  return NextResponse.json({ ascents });
}
