import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

// ── Nominatim geocoding ────────────────────────────────────────────────────────

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  class: string;
};

type GeocodedPlace = { name: string; lat: number; lon: number };

const PLACE_CLASSES = new Set(["place", "boundary"]);

async function geocodePlaces(q: string): Promise<GeocodedPlace[]> {
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
    // Text search — run DB + Nominatim in parallel, return { peaks, places }
    const [peaks, places] = await Promise.all([
      prisma.peak.findMany({
        where: {
          OR: [
            { name:          { contains: q, mode: "insensitive" } },
            { nameEn:        { contains: q, mode: "insensitive" } },
            { mountainRange: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { altitudeM: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          nameEn: true,
          latitude: true,
          longitude: true,
          altitudeM: true,
          mountainRange: true,
          country: true,
          rarityId: true,
          isMythic: true,
          rarity: { select: { id: true, name: true, emoji: true, order: true } },
        },
      }),
      geocodePlaces(q),
    ]);
    return NextResponse.json({ peaks, places });
  }

  if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
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

  // Viewport / radius query — plain array (unchanged shape)
  const peaks = await prisma.peak.findMany({
    where,
    orderBy: { altitudeM: "desc" },
    ...(take ? { take } : {}),
    select: {
      id: true,
      name: true,
      nameEn: true,
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
