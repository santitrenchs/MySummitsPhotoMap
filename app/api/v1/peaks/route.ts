import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";

// ── Nominatim geocoding ────────────────────────────────────────────────────────

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  class: string;
};

const PLACE_CLASSES = new Set(["place", "boundary"]);

async function geocodePlaces(q: string): Promise<{ name: string; lat: number; lon: number }[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=ca,es,en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Peakadex/1.0 (noreply@peakadex.com)" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data: NominatimResult[] = await res.json();
    return data
      .filter((r) => PLACE_CLASSES.has(r.class))
      .slice(0, 5)
      .map((r) => ({
        name: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
      }));
  } catch {
    return [];
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q      = searchParams.get("q")?.trim() ?? "";
  const north  = parseFloat(searchParams.get("north") ?? "");
  const south  = parseFloat(searchParams.get("south") ?? "");
  const east   = parseFloat(searchParams.get("east")  ?? "");
  const west   = parseFloat(searchParams.get("west")  ?? "");

  if (q.length >= 2) {
    // Text search — run DB + Nominatim in parallel
    const [peaks, places] = await Promise.all([
      prisma.peak.findMany({
        where: {
          OR: [
            { name:          { contains: q, mode: "insensitive" } },
            { mountainRange: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { altitudeM: "desc" },
        take: 20,
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
      }),
      geocodePlaces(q),
    ]);
    return NextResponse.json({ peaks, places });
  }

  const zoom  = parseInt(searchParams.get("zoom") ?? "");

  let where: Record<string, unknown> | undefined;
  let take: number | undefined;

  if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
    where = {
      latitude:  { gte: south, lte: north },
      longitude: { gte: west,  lte: east  },
    };
    // Return fewer peaks at low zoom (large viewport) and more at high zoom
    // (small viewport where every local peak matters).
    take = !isNaN(zoom)
      ? zoom < 6  ? 50
      : zoom < 8  ? 150
      : zoom < 11 ? 300
      :             500
      : 300; // fallback for clients that don't send zoom
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

  return NextResponse.json({ peaks, places: [] });
}
