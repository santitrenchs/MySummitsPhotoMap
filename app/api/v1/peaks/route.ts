import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";
import { sampleViewportPeakIds } from "@/lib/peaks/viewport-sample";

// ── Nominatim geocoding ────────────────────────────────────────────────────────

type NominatimResult = {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  class: string;
  type: string;
};

type GeocodedPlace = { name: string; lat: number; lon: number };

const PLACE_CLASSES = new Set(["place", "boundary"]);
const REFUGE_TOURISM_TYPES = new Set(["alpine_hut", "wilderness_hut", "chalet"]);
function isRefuge(r: NominatimResult): boolean {
  return (
    (r.class === "tourism" && REFUGE_TOURISM_TYPES.has(r.type)) ||
    (r.class === "amenity" && r.type === "shelter")
  );
}

async function geocode(q: string): Promise<{ places: GeocodedPlace[]; refugios: GeocodedPlace[] }> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=12&accept-language=ca,es,en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Peakadex/1.0 (noreply@peakadex.com)" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { places: [], refugios: [] };
    const data: NominatimResult[] = await res.json();
    const toPlace = (r: NominatimResult): GeocodedPlace => ({
      name: isRefuge(r) ? r.display_name.split(",")[0].trim() : r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    });
    const places   = data.filter((r) => PLACE_CLASSES.has(r.class)).slice(0, 5).map(toPlace);
    const refugios = data.filter(isRefuge).slice(0, 5).map(toPlace);
    return { places, refugios };
  } catch {
    return { places: [], refugios: [] };
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
  const lat    = parseFloat(searchParams.get("lat")    ?? "");
  const lng    = parseFloat(searchParams.get("lng")    ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "");

  if (q.length >= 2) {
    // Text search — run DB + Nominatim in parallel
    const [peaks, geo] = await Promise.all([
      prisma.peak.findMany({
        where: {
          OR: [
            { name:          { contains: q, mode: "insensitive" } },
            { nameEn:        { contains: q, mode: "insensitive" } },
            { mountainRange: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { altitudeM: "desc" },
        take: 20,
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
          elevationProfile: true,
        },
      }),
      geocode(q),
    ]);
    return NextResponse.json({ peaks, places: geo.places, refugios: geo.refugios });
  }

  const zoom  = parseInt(searchParams.get("zoom") ?? "");

  let where: Record<string, unknown> | undefined;
  let take: number | undefined;
  let includeElevationProfile = true;

  if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
    // Fewer peaks at low zoom (large viewport), more at high zoom (small viewport
    // where every local peak matters).
    const budget = !isNaN(zoom)
      ? zoom < 6  ? 50
      : zoom < 8  ? 150
      : zoom < 11 ? 300
      :             500
      : 300; // fallback for clients that don't send zoom

    // ⚠️ Shared with the web route on purpose — see sampleViewportPeakIds. Ordering
    // the bbox by altitude and taking the first N is a global altitude cut wearing a
    // viewport's clothes: it empties the flat half of the screen entirely. With a
    // budget of 50 at zoom 5 it is even harsher here than on web.
    const ids = await sampleViewportPeakIds(north, south, east, west, budget);
    if (ids.length === 0) return NextResponse.json({ peaks: [], places: [] });
    where = { id: { in: ids } };
  } else if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
    where = {
      latitude:  { gte: lat - radius, lte: lat + radius },
      longitude: { gte: lng - radius, lte: lng + radius },
    };
    take = 50;
    includeElevationProfile = false;
  }

  // No usable search text (< 2 chars) and no valid bbox/radius params: refuse
  // to run an unbounded full-table query. Before this guard, a 1-char `q` (or
  // missing params) skipped every branch and returned the ENTIRE peak catalog.
  if (!where) {
    return NextResponse.json({ peaks: [], places: [], refugios: [] });
  }

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
      // Altitude + isolation ranking, so the Android viewport scoring can rank a
      // mountain above its own shoulder instead of re-sorting by height.
      importance: true,
      ...(includeElevationProfile ? { elevationProfile: true } : {}),
    },
  });

  return NextResponse.json({ peaks, places: [] });
}
