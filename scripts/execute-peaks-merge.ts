/**
 * execute-peaks-merge.ts
 *
 * Executes the peaks merge plan:
 *   1. Delete ES peaks without ascents (732)
 *   2. For ES peaks with ascents + OSM match: create OSM peak, reassign
 *      ascents, delete old peak (in a transaction)
 *   3. Insert all 36,715 OSM peaks as new catalog
 *
 * Peaks with ascents but no OSM match (e.g. Mont Blanc de Courmayeur) are
 * left untouched.
 *
 * Run:
 *   DATABASE_URL="..." npx tsx scripts/execute-peaks-merge.ts
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
const NDJSON_PATH  = "/tmp/spain-peaks.ndjson";
const BATCH_SIZE   = 500;

const ALT_TOLERANCE_M  = 50;
const DIST_TOLERANCE_M = 500;
const NAME_MIN_SCORE   = 0.4;

// ── Types ─────────────────────────────────────────────────────────────────────

interface OsmPeak {
  osmId: string;
  name: string;
  altitudeM: number;
  latitude: number;
  longitude: number;
  mountainRange: string | null;
  comarca: string | null;
}

interface DbPeak {
  id: string;
  name: string;
  altitudeM: number;
  latitude: number;
  longitude: number;
  osmId: string | null;
  _ascentCount: number;
}

// ── Helpers (same as analyze script) ─────────────────────────────────────────

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

function nameSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.size === 0 && bb.size === 0) return 1;
  if (ba.size === 0 || bb.size === 0) return 0;
  let shared = 0;
  for (const bg of ba) if (bb.has(bg)) shared++;
  return (2 * shared) / (ba.size + bb.size);
}

function findBestMatch(dbPeak: DbPeak, osmPeaks: OsmPeak[]): OsmPeak | null {
  let best: { osm: OsmPeak; score: number } | null = null;
  for (const osm of osmPeaks) {
    if (Math.abs(osm.altitudeM - dbPeak.altitudeM) > ALT_TOLERANCE_M) continue;
    if (haversineM(dbPeak.latitude, dbPeak.longitude, osm.latitude, osm.longitude) > DIST_TOLERANCE_M) continue;
    const nameSim = nameSimilarity(dbPeak.name, osm.name);
    if (nameSim < NAME_MIN_SCORE) continue;
    const distM = haversineM(dbPeak.latitude, dbPeak.longitude, osm.latitude, osm.longitude);
    const altDiff = Math.abs(osm.altitudeM - dbPeak.altitudeM);
    const score = nameSim * 0.6 + (1 - distM / DIST_TOLERANCE_M) * 0.25 + (1 - altDiff / ALT_TOLERANCE_M) * 0.15;
    if (!best || score > best.score) best = { osm, score };
  }
  return best?.osm ?? null;
}

function getRarityId(altitudeM: number): string {
  if (altitudeM >= 8000) return "snow_lotus";
  if (altitudeM >= 7000) return "cinquefoil";
  if (altitudeM >= 5000) return "saxifrage";
  if (altitudeM >= 3000) return "edelweiss";
  if (altitudeM >= 1500) return "gentian";
  return "daisy";
}

async function loadOsmPeaks(): Promise<OsmPeak[]> {
  const peaks: OsmPeak[] = [];
  const rl = createInterface({ input: createReadStream(NDJSON_PATH) });
  for await (const line of rl) {
    if (line.trim()) peaks.push(JSON.parse(line));
  }
  return peaks;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Loading OSM peaks…");
  const osmPeaks = await loadOsmPeaks();
  console.log(`  ${osmPeaks.length.toLocaleString()} OSM peaks\n`);

  // Fetch all ES peaks from DB
  const dbPeaksRaw = await prisma.peak.findMany({
    where: { country: "ES" },
    select: {
      id: true, name: true, altitudeM: true,
      latitude: true, longitude: true, osmId: true,
      _count: { select: { ascents: true } },
    },
  });
  const dbPeaks: DbPeak[] = dbPeaksRaw.map(p => ({
    id: p.id, name: p.name, altitudeM: p.altitudeM,
    latitude: p.latitude, longitude: p.longitude, osmId: p.osmId,
    _ascentCount: p._count.ascents,
  }));

  const withAscents    = dbPeaks.filter(p => p._ascentCount > 0);
  const withoutAscents = dbPeaks.filter(p => p._ascentCount === 0);

  // ── Step 1: delete peaks without ascents ──────────────────────────────────
  console.log(`Step 1 — Deleting ${withoutAscents.length} ES peaks without ascents…`);
  const idsToDelete = withoutAscents.map(p => p.id);
  let deleted = 0;
  for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
    const batch = idsToDelete.slice(i, i + BATCH_SIZE);
    await prisma.peak.deleteMany({ where: { id: { in: batch } } });
    deleted += batch.length;
    process.stdout.write(`\r  Deleted ${deleted}/${idsToDelete.length}…`);
  }
  console.log(`\r  ✅ Deleted ${deleted} peaks\n`);

  // ── Step 2: match peaks with ascents → reassign → delete old ──────────────
  console.log(`Step 2 — Merging ${withAscents.length} peaks with ascents…`);
  let merged = 0;
  let skipped = 0;

  for (const dbPeak of withAscents) {
    const osmMatch = findBestMatch(dbPeak, osmPeaks);
    if (!osmMatch) {
      console.log(`  ⚠️  No match for "${dbPeak.name}" — keeping as-is`);
      skipped++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      // Create the OSM peak (it doesn't exist yet)
      const newPeak = await tx.peak.create({
        data: {
          id:            randomUUID(),
          name:          osmMatch.name,
          altitudeM:     osmMatch.altitudeM,
          latitude:      osmMatch.latitude,
          longitude:     osmMatch.longitude,
          mountainRange: osmMatch.mountainRange,
          comarca:       osmMatch.comarca,
          country:       "ES",
          osmId:         osmMatch.osmId,
          rarityId:      getRarityId(osmMatch.altitudeM),
        },
      });

      // Reassign all ascents from old peak to new OSM peak
      await tx.ascent.updateMany({
        where:  { peakId: dbPeak.id },
        data:   { peakId: newPeak.id },
      });

      // Delete old peak
      await tx.peak.delete({ where: { id: dbPeak.id } });
    });

    console.log(`  ✅ "${dbPeak.name}" → "${osmMatch.name}" (${dbPeak._ascentCount} ascent(s) reassigned)`);
    merged++;
  }
  console.log(`\n  Merged: ${merged}  |  Kept (no match): ${skipped}\n`);

  // ── Step 3: insert all OSM peaks ──────────────────────────────────────────
  // Build set of osmIds already in DB (from step 2 merges)
  const existingOsmIds = new Set(
    (await prisma.peak.findMany({ where: { osmId: { not: null } }, select: { osmId: true } }))
      .map(p => p.osmId!)
  );

  const toInsert = osmPeaks.filter(p => !existingOsmIds.has(p.osmId));
  console.log(`Step 3 — Inserting ${toInsert.length.toLocaleString()} new OSM peaks…`);

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE).map(p => ({
      id:            randomUUID(),
      name:          p.name,
      altitudeM:     p.altitudeM,
      latitude:      p.latitude,
      longitude:     p.longitude,
      mountainRange: p.mountainRange,
      comarca:       p.comarca,
      country:       "ES",
      osmId:         p.osmId,
      rarityId:      getRarityId(p.altitudeM),
    }));
    await prisma.peak.createMany({ data: batch, skipDuplicates: true });
    inserted += batch.length;
    process.stdout.write(`\r  Inserted ${inserted.toLocaleString()}/${toInsert.length.toLocaleString()}…`);
  }
  console.log(`\r  ✅ Inserted ${inserted.toLocaleString()} peaks\n`);

  // ── Final count ───────────────────────────────────────────────────────────
  const finalCount = await prisma.peak.count();
  console.log("═".repeat(50));
  console.log("DONE");
  console.log("═".repeat(50));
  console.log(`  Deleted:  ${deleted} (no ascents)`);
  console.log(`  Merged:   ${merged} (ascents reassigned to OSM peak)`);
  console.log(`  Kept:     ${skipped} (no OSM match, manual review)`);
  console.log(`  Inserted: ${inserted.toLocaleString()} new OSM peaks`);
  console.log(`  Total peaks in DB now: ${finalCount.toLocaleString()}`);
}

main()
  .catch(err => { console.error("\nError:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
