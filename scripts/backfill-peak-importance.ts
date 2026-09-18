/**
 * Fills Peak.isolationKm and Peak.importance for the whole catalogue.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Atlas ranked peaks by altitude, and altitude alone cannot tell a mountain
 * from its own shoulder. Sorting the Mont Blanc massif by height returns the
 * Aiguille this and the Pointe that before it ever reaches the Grandes Jorasses,
 * so a screen that fits twenty labels spends them on one summit's ridge.
 *
 * The cartographic answer is topographic PROMINENCE, which needs a DEM we do not
 * have. Its standard companion, ISOLATION — the distance to the nearest higher
 * summit — needs only the points we already store, and separates the same cases:
 * an aiguille has a higher neighbour 800 m away, the Jorasses' is 10 km off, and
 * Mont Blanc's is in the Caucasus. It also promotes the modest local king: a
 * 1,000 m hill that is the highest thing for 30 km is genuinely the peak you would
 * name there, and altitude ranking buried it.
 *
 * HOW
 * ---
 * Sort by altitude descending and insert into a spatial hash as we go. When a peak
 * is processed every peak already in the grid is higher than it, so its isolation
 * is the nearest neighbour among them — one pass, no O(n²) comparison. The search
 * walks outward ring by ring and stops as soon as the next ring cannot beat the
 * best distance found, which is what keeps it near-linear.
 *
 * Usage:  npx tsx scripts/backfill-peak-importance.ts [--dry]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DRY = process.argv.includes("--dry");

/** Cell size of the spatial hash, in degrees of latitude (~55 km). */
const CELL_DEG = 0.5;
/** Isolation is capped here: past it, "very isolated" stops carrying information. */
const ISO_CAP_KM = 200;
/** Altitude that already scores a full 1.0 — matches ALT_REFERENCE_M in MapView. */
const ALT_REF_M = 3000;
/** Weights. Isolation leads: it is what distinguishes a summit from a shoulder. */
const W_ALT = 0.4;
const W_ISO = 0.6;

const EARTH_R_KM = 6371;

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLon = (bLon - aLon) * toRad;
  const la1 = aLat * toRad;
  const la2 = bLat * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

type P = { id: string; latitude: number; longitude: number; altitudeM: number };

function cellKey(latIdx: number, lonIdx: number): string {
  return `${latIdx}:${lonIdx}`;
}

async function main() {
  console.log("Loading peaks…");
  const peaks: P[] = await prisma.peak.findMany({
    select: { id: true, latitude: true, longitude: true, altitudeM: true },
  });
  console.log(`  ${peaks.length} peaks`);

  // Highest first: when a peak is processed, everything already placed is higher.
  // Ties broken by id so the run is reproducible.
  peaks.sort((a, b) => b.altitudeM - a.altitudeM || (a.id < b.id ? -1 : 1));

  const grid = new Map<string, P[]>();
  const isolation = new Map<string, number>();

  // Longitude degrees shrink with latitude; using a fixed degree cell would make
  // cells near the poles far narrower in km than near the equator. Converting the
  // search radius per peak keeps the ring test honest.
  const kmPerLatDeg = 111.32;

  let done = 0;
  for (const p of peaks) {
    const latIdx = Math.floor(p.latitude / CELL_DEG);
    const lonIdx = Math.floor(p.longitude / CELL_DEG);

    let best = Infinity;
    const kmPerLonDeg = Math.max(1e-6, kmPerLatDeg * Math.cos((p.latitude * Math.PI) / 180));
    const cellKmLat = CELL_DEG * kmPerLatDeg;
    const cellKmLon = CELL_DEG * kmPerLonDeg;
    const minCellKm = Math.min(cellKmLat, cellKmLon);
    const maxRing = Math.ceil(ISO_CAP_KM / minCellKm) + 1;

    for (let ring = 0; ring <= maxRing; ring++) {
      // Anything in this ring is at least (ring-1) whole cells away. Once that
      // floor exceeds the best distance so far, no further ring can improve it.
      if (ring > 1 && (ring - 1) * minCellKm > best) break;
      if (ring > 1 && (ring - 1) * minCellKm > ISO_CAP_KM) break;

      for (let dLat = -ring; dLat <= ring; dLat++) {
        for (let dLon = -ring; dLon <= ring; dLon++) {
          // Only the perimeter — the interior was covered by an earlier ring.
          if (ring > 0 && Math.abs(dLat) !== ring && Math.abs(dLon) !== ring) continue;
          const bucket = grid.get(cellKey(latIdx + dLat, lonIdx + dLon));
          if (!bucket) continue;
          for (const q of bucket) {
            const d = haversineKm(p.latitude, p.longitude, q.latitude, q.longitude);
            if (d < best) best = d;
          }
        }
      }
    }

    isolation.set(p.id, Math.min(best, ISO_CAP_KM));

    const key = cellKey(latIdx, lonIdx);
    const bucket = grid.get(key);
    if (bucket) bucket.push(p);
    else grid.set(key, [p]);

    if (++done % 20000 === 0) console.log(`  swept ${done}/${peaks.length}`);
  }

  // The single highest peak of the catalogue has no higher neighbour at all.
  console.log("Sweep done. Computing importance…");

  const logCap = Math.log10(1 + ISO_CAP_KM);
  const rows = peaks.map((p) => {
    const isoKm = isolation.get(p.id) ?? ISO_CAP_KM;
    // Log scale: the step from 1 km to 10 km says far more about a summit than the
    // step from 100 km to 110 km, and a linear scale would flatten every ordinary
    // mountain into the bottom of the range.
    const normIso = Math.min(Math.log10(1 + isoKm) / logCap, 1);
    const normAlt = Math.min(p.altitudeM / ALT_REF_M, 1);
    return {
      id: p.id,
      isolationKm: Number(isoKm.toFixed(3)),
      importance: Number((W_ALT * normAlt + W_ISO * normIso).toFixed(5)),
    };
  });

  if (DRY) {
    const sample = [...rows].sort((a, b) => b.importance - a.importance).slice(0, 15);
    const byId = new Map(peaks.map((p) => [p.id, p]));
    console.log("\nTop 15 by importance (dry run, nothing written):");
    for (const r of sample) {
      const p = byId.get(r.id)!;
      console.log(`  ${r.importance.toFixed(3)}  ${String(p.altitudeM).padStart(5)} m  iso ${String(r.isolationKm).padStart(8)} km`);
    }
    await prisma.$disconnect();
    return;
  }

  console.log("Writing…");
  // One UPDATE … FROM per chunk instead of a query per peak: 84k round trips would
  // dominate the runtime by orders of magnitude over the sweep itself.
  const CHUNK = 2000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const ids = chunk.map((r) => r.id);
    const isos = chunk.map((r) => r.isolationKm);
    const imps = chunk.map((r) => r.importance);
    await prisma.$executeRaw`
      UPDATE peaks AS p
      SET "isolationKm" = v.iso, "importance" = v.imp
      FROM (
        SELECT * FROM unnest(
          ${ids}::text[], ${isos}::float8[], ${imps}::float8[]
        ) AS t(id, iso, imp)
      ) AS v
      WHERE p.id = v.id
    `;
    console.log(`  wrote ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
