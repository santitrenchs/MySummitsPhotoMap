import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";

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
// Mountain huts / refuges as tagged in OSM. `tourism=alpine_hut` and
// `tourism=wilderness_hut` are the canonical refuge tags; `amenity=shelter` covers
// some staffed/unstaffed mountain shelters too.
const REFUGE_TOURISM_TYPES = new Set(["alpine_hut", "wilderness_hut", "chalet"]);
function isRefuge(r: NominatimResult): boolean {
  return (
    (r.class === "tourism" && REFUGE_TOURISM_TYPES.has(r.type)) ||
    (r.class === "amenity" && r.type === "shelter")
  );
}

async function geocode(q: string): Promise<{ places: GeocodedPlace[]; refugios: GeocodedPlace[] }> {
  try {
    // limit=12 so refuges (lower OSM importance) still surface alongside towns.
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=12&accept-language=ca,es,en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Peakadex/1.0 (noreply@peakadex.com)" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { places: [], refugios: [] };
    const data: NominatimResult[] = await res.json();
    const toPlace = (r: NominatimResult): GeocodedPlace => ({
      // Refuges: show just the leading name segment (display_name is verbose).
      name: isRefuge(r) ? r.display_name.split(",")[0].trim() : r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    });
    const places = data.filter((r) => PLACE_CLASSES.has(r.class)).slice(0, 5).map(toPlace);
    const refugios = data.filter(isRefuge).slice(0, 5).map(toPlace);
    return { places, refugios };
  } catch {
    return { places: [], refugios: [] };
  }
}

// ── Spatially even viewport sampling ──────────────────────────────────────────

/**
 * Which peaks to send for a viewport, when the viewport holds far more than the
 * budget.
 *
 * ⚠️ The obvious answer — `ORDER BY "altitudeM" DESC LIMIT 600` — is a GLOBAL
 * altitude cut wearing a viewport's clothes, and it empties half the map. Measured
 * on a zoom-7 viewport over the Pyrenees + Catalonia: 8,479 peaks inside, the 600th
 * sits at 2,732 m, and of the 3,552 peaks in the southern half exactly ZERO are
 * sent. Montserrat and the Montseny are not filtered out on the client — they never
 * leave the database. 84% of the catalogue is below 2,000 m, so this ships the
 * highest 6% of the world and calls it a map.
 *
 * Instead: cut the viewport into a GRID x GRID mesh and hand out the budget
 * round-robin — every cell's best peak before any cell's second. A cell with four
 * 800 m hills gets all four; the Mont Blanc cell keeps taking more as `rn` climbs,
 * so the full budget is still spent. Empty cells simply do not bid.
 *
 * This decides WHICH peaks travel, not which ones are drawn: the client still
 * scores and thins them (MapView → computeViewportScores).
 */
const GRID = 8;
const VIEWPORT_BUDGET = 600;

async function sampleViewportPeakIds(
  north: number, south: number, east: number, west: number, budget: number,
): Promise<string[]> {
  // A viewport crossing the antimeridian arrives with east < west. Unrolling the
  // east edge past 180° and shifting the peaks that fall beyond it makes the grid
  // arithmetic identical in both cases — width_bucket needs a monotonic axis.
  const eastAdj = east >= west ? east : east + 360;
  // Degenerate spans (a fully zoomed-in viewport, or a rounding collapse) would make
  // width_bucket throw on equal bounds.
  const latHi = north > south  ? north   : south + 1e-9;
  const lonHi = eastAdj > west ? eastAdj : west  + 1e-9;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    WITH vp AS (
      SELECT id, "altitudeM", latitude,
             CASE WHEN longitude < ${west}::float8 THEN longitude + 360 ELSE longitude END AS lon
      FROM peaks
      WHERE latitude BETWEEN ${south}::float8 AND ${north}::float8
        AND (CASE WHEN longitude < ${west}::float8 THEN longitude + 360 ELSE longitude END)
            BETWEEN ${west}::float8 AND ${eastAdj}::float8
    ),
    binned AS (
      -- ⚠️ Every argument is cast. Prisma binds a JS number as numeric (or bigint
      -- when it happens to be integral), and width_bucket has no overload for that
      -- mix — the call fails with 42883 at runtime while the same SQL typed by hand
      -- in psql works fine, because there the literals resolve to one type.
      SELECT id, "altitudeM",
             LEAST(GREATEST(width_bucket(
               latitude::float8, ${south}::float8, ${latHi}::float8, ${GRID}::int), 1), ${GRID}) AS gy,
             LEAST(GREATEST(width_bucket(
               lon::float8,      ${west}::float8,  ${lonHi}::float8, ${GRID}::int), 1), ${GRID}) AS gx
      FROM vp
    ),
    ranked AS (
      SELECT id, "altitudeM",
             row_number() OVER (PARTITION BY gx, gy ORDER BY "altitudeM" DESC, id) AS rn
      FROM binned
    )
    SELECT id FROM ranked
    ORDER BY rn ASC, "altitudeM" DESC
    LIMIT ${budget}::int
  `);

  return rows.map((r) => r.id);
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
      geocode(q),
    ]);
    return NextResponse.json({ peaks, places: geo.places, refugios: geo.refugios });
  }

  if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
    // Spatially even sample — see sampleViewportPeakIds. It returns ids only, so
    // the row shape below (nested `rarity`) stays the single source of truth
    // instead of being rebuilt by hand in SQL.
    const ids = await sampleViewportPeakIds(north, south, east, west, VIEWPORT_BUDGET);
    if (ids.length === 0) return NextResponse.json([]);
    where = { id: { in: ids } };
  } else if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
    where = {
      latitude:  { gte: lat - radius, lte: lat + radius },
      longitude: { gte: lng - radius, lte: lng + radius },
    };
    take = VIEWPORT_BUDGET;
  } else {
    // No search query, no viewport, no radius → never return the whole catalog.
    // The full peak table is hundreds of thousands of rows (~100 MB); a bare
    // /api/peaks would time out and break callers. Require an explicit filter.
    return NextResponse.json([]);
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
