import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

// Returns all peak coordinates as a minimal GeoJSON FeatureCollection.
// Used exclusively by the map heatmap layer — no properties, just geometry.
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const peaks = await prisma.peak.findMany({
    select: { latitude: true, longitude: true },
  });

  const features = peaks.map((p) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] },
    properties: null,
  }));

  return NextResponse.json(
    { type: "FeatureCollection", features },
    {
      headers: {
        // Cache for 10 minutes — peak catalog changes rarely
        "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
      },
    }
  );
}
