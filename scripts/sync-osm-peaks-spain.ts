/**
 * sync-osm-peaks-spain.ts
 *
 * Safe OSM sync for Spain peaks. Four rules applied in order:
 *
 *   1. ES peaks WITH ascents + osmId  → UPDATE fields from OSM in place (never delete)
 *   2. ES peaks WITH ascents, no osmId → fuzzy-match by name+altitude+proximity
 *                                         → if match: UPDATE osmId + fields in place
 *                                         → if no match: keep as-is, log warning
 *   3. ES peaks WITHOUT ascents        → DELETE (safe, no user data lost)
 *   4. OSM nodes not yet in DB         → INSERT as new peaks
 *
 * Input:  /tmp/spain-peaks.ndjson  (produced by fetch-osm-peaks-spain.ts)
 * Run:
 *   DATABASE_URL="..." npx tsx scripts/sync-osm-peaks-spain.ts [--dry-run]
 *
 * --dry-run: shows what would happen without touching the DB.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma    = new PrismaClient();
const DRY_RUN   = process.argv.includes("--dry-run");
const NDJSON    = "/tmp/spain-peaks.ndjson";
const BATCH     = 500;

const ALT_TOL   = 50;    // metres altitude tolerance for fuzzy match
const DIST_TOL  = 500;   // metres distance tolerance for fuzzy match
const NAME_MIN  = 0.4;   // minimum name similarity score [0–1]

if (DRY_RUN) console.log("🔍  DRY-RUN mode — no DB changes will be made\n");

// ── Types ──────────────────────────────────────────────────────────────────────

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
  ascentCount: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function findBestMatch(db: DbPeak, osmPeaks: OsmPeak[]): { osm: OsmPeak; score: number } | null {
  let best: { osm: OsmPeak; score: number } | null = null;
  for (const osm of osmPeaks) {
    if (Math.abs(osm.altitudeM - db.altitudeM) > ALT_TOL) continue;
    const distM = haversineM(db.latitude, db.longitude, osm.latitude, osm.longitude);
    if (distM > DIST_TOL) continue;
    const nameSim = nameSimilarity(db.name, osm.name);
    if (nameSim < NAME_MIN) continue;
    const altDiff = Math.abs(osm.altitudeM - db.altitudeM);
    const score = nameSim * 0.6 + (1 - distM / DIST_TOL) * 0.25 + (1 - altDiff / ALT_TOL) * 0.15;
    if (!best || score > best.score) best = { osm, score };
  }
  return best;
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
  const rl = createInterface({ input: createReadStream(NDJSON) });
  for await (const line of rl) {
    if (line.trim()) peaks.push(JSON.parse(line));
  }
  return peaks;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Loading OSM peaks from", NDJSON, "…");
  const osmPeaks = await loadOsmPeaks();
  console.log(`  ${osmPeaks.length.toLocaleString()} OSM peaks loaded\n`);

  // Index OSM peaks by osmId for fast lookup in step 1
  const osmById = new Map(osmPeaks.map(p => [p.osmId, p]));

  // Track which osmIds are consumed (either by update or already present)
  const consumedOsmIds = new Set<string>();

  // Fetch all ES peaks from DB
  const rawDb = await prisma.peak.findMany({
    where: { country: "ES" },
    select: {
      id: true, name: true, altitudeM: true,
      latitude: true, longitude: true, osmId: true,
      _count: { select: { ascents: true } },
    },
  });
  const dbPeaks: DbPeak[] = rawDb.map(p => ({
    id: p.id, name: p.name, altitudeM: p.altitudeM,
    latitude: p.latitude, longitude: p.longitude, osmId: p.osmId,
    ascentCount: p._count.ascents,
  }));

  const withAscents    = dbPeaks.filter(p => p.ascentCount > 0);
  const withoutAscents = dbPeaks.filter(p => p.ascentCount === 0);
  const withOsmId      = withAscents.filter(p => p.osmId !== null);
  const withoutOsmId   = withAscents.filter(p => p.osmId === null);

  console.log(`ES peaks in DB:        ${dbPeaks.length.toLocaleString()}`);
  console.log(`  With ascents:        ${withAscents.length}`);
  console.log(`    → has osmId:       ${withOsmId.length}`);
  console.log(`    → no osmId:        ${withoutOsmId.length}`);
  console.log(`  Without ascents:     ${withoutAscents.length}\n`);

  // ── Step 1: UPDATE peaks with ascents that already have osmId ────────────────
  console.log(`Step 1 — Updating ${withOsmId.length} peaks with ascents + osmId…`);
  let step1Updated = 0;
  let step1Stale   = 0;

  for (const db of withOsmId) {
    const osm = osmById.get(db.osmId!);
    consumedOsmIds.add(db.osmId!);

    if (!osm) {
      // osmId no longer exists in current OSM export — keep DB record, just warn
      console.log(`  ⚠️  osmId ${db.osmId} not in export → keeping "${db.name}" as-is`);
      step1Stale++;
      continue;
    }

    const changed =
      db.name !== osm.name ||
      db.altitudeM !== osm.altitudeM ||
      Math.abs(db.latitude  - osm.latitude)  > 1e-7 ||
      Math.abs(db.longitude - osm.longitude) > 1e-7;

    if (!changed) continue;

    if (!DRY_RUN) {
      await prisma.peak.update({
        where: { id: db.id },
        data: {
          name:          osm.name,
          altitudeM:     osm.altitudeM,
          latitude:      osm.latitude,
          longitude:     osm.longitude,
          mountainRange: osm.mountainRange,
          comarca:       osm.comarca,
          rarityId:      getRarityId(osm.altitudeM),
        },
      });
    }
    console.log(`  ✅ Updated "${db.name}"${db.name !== osm.name ? ` → "${osm.name}"` : ""} (${db.ascentCount} ascent(s))`);
    step1Updated++;
  }
  console.log(`  Updated: ${step1Updated}  |  Stale osmId (kept): ${step1Stale}\n`);

  // ── Step 2: fuzzy-match peaks with ascents but no osmId ──────────────────────
  console.log(`Step 2 — Fuzzy-matching ${withoutOsmId.length} peaks with ascents but no osmId…`);
  let step2Matched = 0;
  let step2Kept    = 0;

  // Only search against OSM peaks not yet consumed
  const osmForFuzzy = osmPeaks.filter(p => !consumedOsmIds.has(p.osmId));

  for (const db of withoutOsmId) {
    const match = findBestMatch(db, osmForFuzzy);

    if (!match) {
      console.log(`  ⚠️  No match for "${db.name}" (${db.altitudeM} m) — keeping as-is`);
      step2Kept++;
      continue;
    }

    consumedOsmIds.add(match.osm.osmId);

    if (!DRY_RUN) {
      await prisma.peak.update({
        where: { id: db.id },
        data: {
          osmId:         match.osm.osmId,
          name:          match.osm.name,
          altitudeM:     match.osm.altitudeM,
          latitude:      match.osm.latitude,
          longitude:     match.osm.longitude,
          mountainRange: match.osm.mountainRange,
          comarca:       match.osm.comarca,
          rarityId:      getRarityId(match.osm.altitudeM),
        },
      });
    }
    const scoreLabel = `score=${match.score.toFixed(2)}`;
    console.log(`  ✅ "${db.name}" → "${match.osm.name}" (${scoreLabel}, ${db.ascentCount} ascent(s))`);
    step2Matched++;
  }
  console.log(`  Matched: ${step2Matched}  |  No match (kept): ${step2Kept}\n`);

  // ── Step 3: DELETE ES peaks without ascents ───────────────────────────────────
  console.log(`Step 3 — Deleting ${withoutAscents.length} ES peaks without ascents…`);
  const idsToDelete = withoutAscents.map(p => p.id);
  let step3Deleted  = 0;

  if (!DRY_RUN) {
    for (let i = 0; i < idsToDelete.length; i += BATCH) {
      const batch = idsToDelete.slice(i, i + BATCH);
      await prisma.peak.deleteMany({ where: { id: { in: batch } } });
      step3Deleted += batch.length;
      process.stdout.write(`\r  Deleted ${step3Deleted}/${idsToDelete.length}…`);
    }
    if (idsToDelete.length > 0) process.stdout.write("\n");
  } else {
    step3Deleted = idsToDelete.length;
  }
  console.log(`  ✅ Deleted: ${step3Deleted}\n`);

  // ── Step 4: INSERT OSM peaks not yet in DB ────────────────────────────────────
  const toInsert = osmPeaks.filter(p => !consumedOsmIds.has(p.osmId));
  console.log(`Step 4 — Inserting ${toInsert.length.toLocaleString()} new OSM peaks…`);
  let step4Inserted = 0;

  if (!DRY_RUN) {
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH).map(p => ({
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
      step4Inserted += batch.length;
      process.stdout.write(`\r  Inserted ${step4Inserted.toLocaleString()}/${toInsert.length.toLocaleString()}…`);
    }
    if (toInsert.length > 0) process.stdout.write("\n");
  } else {
    step4Inserted = toInsert.length;
  }
  console.log(`  ✅ Inserted: ${step4Inserted.toLocaleString()}\n`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  const finalCount = DRY_RUN ? null : await prisma.peak.count();

  console.log("═".repeat(56));
  console.log(DRY_RUN ? "DRY-RUN SUMMARY (no changes made)" : "DONE");
  console.log("═".repeat(56));
  console.log(`  Step 1 – Updated in place (had osmId):    ${step1Updated}`);
  console.log(`  Step 1 – Stale osmId kept as-is:          ${step1Stale}`);
  console.log(`  Step 2 – Fuzzy-matched + osmId set:        ${step2Matched}`);
  console.log(`  Step 2 – No match, kept as-is:             ${step2Kept}`);
  console.log(`  Step 3 – Deleted (no ascents):             ${step3Deleted}`);
  console.log(`  Step 4 – Inserted (new OSM peaks):         ${step4Inserted.toLocaleString()}`);
  if (finalCount !== null) {
    console.log(`  Total peaks in DB now:                     ${finalCount.toLocaleString()}`);
  }
}

main()
  .catch(err => { console.error("\nError:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
