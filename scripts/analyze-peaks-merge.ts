/**
 * analyze-peaks-merge.ts
 *
 * Dry-run analysis of how to merge existing DB peaks with OSM data.
 * Reads /tmp/spain-peaks.ndjson (from fetch-osm-peaks-spain.ts).
 * Does NOT write anything to the database.
 *
 * Run:
 *   DATABASE_URL="..." npx tsx scripts/analyze-peaks-merge.ts
 *
 * Output sections:
 *   [A] Peaks with ascents → clear OSM match found
 *   [B] Peaks with ascents → no OSM match (manual review needed)
 *   [C] Peaks without ascents → will be deleted (count only)
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const NDJSON_PATH = "/tmp/spain-peaks.ndjson";

// ── Matching thresholds ───────────────────────────────────────────────────────

const ALT_TOLERANCE_M  = 50;   // altitude must be within ±50 m
const DIST_TOLERANCE_M = 500;  // coordinates must be within 500 m
const NAME_MIN_SCORE   = 0.4;  // minimum name similarity (0–1)

// ── Types ─────────────────────────────────────────────────────────────────────

interface OsmPeak {
  osmId: string;
  name: string;
  altitudeM: number;
  latitude: number;
  longitude: number;
  mountainRange: string | null;
  comarca: string | null;
  _osm: { wikipedia?: string; wikidata?: string; prominence?: number | null };
}

interface DbPeak {
  id: string;
  name: string;
  altitudeM: number;
  latitude: number;
  longitude: number;
  mountainRange: string | null;
  osmId: string | null;
  _ascentCount: number;
}

interface MatchResult {
  dbPeak: DbPeak;
  osmPeak: OsmPeak;
  score: number;
  distM: number;
  altDiff: number;
}

// ── Geo helpers ───────────────────────────────────────────────────────────────

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

// ── Name similarity (Dice coefficient on bigrams) ─────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // strip accents
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
  // Also check if one contains the other (handles "Pico de Mulhacén" vs "Mulhacén")
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.size === 0 && bb.size === 0) return 1;
  if (ba.size === 0 || bb.size === 0) return 0;
  let shared = 0;
  for (const bg of ba) if (bb.has(bg)) shared++;
  return (2 * shared) / (ba.size + bb.size);
}

// ── Load NDJSON ───────────────────────────────────────────────────────────────

async function loadOsmPeaks(): Promise<OsmPeak[]> {
  const peaks: OsmPeak[] = [];
  const rl = createInterface({ input: createReadStream(NDJSON_PATH) });
  for await (const line of rl) {
    if (line.trim()) peaks.push(JSON.parse(line));
  }
  return peaks;
}

// ── Find best OSM match for a DB peak ────────────────────────────────────────

function findBestMatch(dbPeak: DbPeak, osmPeaks: OsmPeak[]): MatchResult | null {
  let best: MatchResult | null = null;

  for (const osm of osmPeaks) {
    const altDiff = Math.abs(osm.altitudeM - dbPeak.altitudeM);
    if (altDiff > ALT_TOLERANCE_M) continue;

    const distM = haversineM(dbPeak.latitude, dbPeak.longitude, osm.latitude, osm.longitude);
    if (distM > DIST_TOLERANCE_M) continue;

    const nameSim = nameSimilarity(dbPeak.name, osm.name);
    if (nameSim < NAME_MIN_SCORE) continue;

    // Combined score: name similarity weighted most, then distance, then altitude diff
    const score =
      nameSim * 0.6 +
      (1 - distM / DIST_TOLERANCE_M) * 0.25 +
      (1 - altDiff / ALT_TOLERANCE_M) * 0.15;

    if (!best || score > best.score) {
      best = { dbPeak, osmPeak: osm, score, distM, altDiff };
    }
  }

  return best;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Loading OSM peaks from", NDJSON_PATH, "…");
  const osmPeaks = await loadOsmPeaks();
  console.log(`  ${osmPeaks.length.toLocaleString()} OSM peaks loaded\n`);

  console.log("Loading DB peaks from sandbox…");
  // Only Spain peaks — we are replacing ES catalog only
  const dbPeaksRaw = await prisma.peak.findMany({
    where: { country: "ES" },
    select: {
      id: true, name: true, altitudeM: true,
      latitude: true, longitude: true, mountainRange: true, osmId: true,
      _count: { select: { ascents: true } },
    },
  });

  const dbPeaks: DbPeak[] = dbPeaksRaw.map(p => ({
    id: p.id, name: p.name, altitudeM: p.altitudeM,
    latitude: p.latitude, longitude: p.longitude,
    mountainRange: p.mountainRange, osmId: p.osmId,
    _ascentCount: p._count.ascents,
  }));

  const withAscents    = dbPeaks.filter(p => p._ascentCount > 0);
  const withoutAscents = dbPeaks.filter(p => p._ascentCount === 0);

  console.log(`  ${dbPeaks.length} total DB peaks`);
  console.log(`  ${withAscents.length} with ascents (need careful merge)`);
  console.log(`  ${withoutAscents.length} without ascents (safe to delete)\n`);

  // ── Section A & B: peaks with ascents ─────────────────────────────────────

  const matched:   MatchResult[] = [];
  const unmatched: DbPeak[]      = [];

  for (const dbPeak of withAscents) {
    const result = findBestMatch(dbPeak, osmPeaks);
    if (result) matched.push(result);
    else unmatched.push(dbPeak);
  }

  // ── Print Section A: matched ──────────────────────────────────────────────

  console.log("═".repeat(70));
  console.log(`[A] PEAKS WITH ASCENTS → OSM MATCH FOUND (${matched.length})`);
  console.log("═".repeat(70));

  if (matched.length === 0) {
    console.log("  (none)\n");
  } else {
    for (const m of matched.sort((a, b) => b.score - a.score)) {
      const { dbPeak, osmPeak, score, distM, altDiff } = m;
      console.log(`\n  DB  : "${dbPeak.name}" — ${dbPeak.altitudeM}m  (id: ${dbPeak.id})`);
      console.log(`  OSM : "${osmPeak.name}" — ${osmPeak.altitudeM}m  (osmId: ${osmPeak.osmId})`);
      console.log(`  Score: ${(score * 100).toFixed(0)}%  |  dist: ${distM.toFixed(0)}m  |  alt diff: ${altDiff}m  |  ascents: ${dbPeak._ascentCount}`);
      console.log(`  Action: reassign ${dbPeak._ascentCount} ascent(s) → OSM peak, delete DB peak`);
    }
    console.log();
  }

  // ── Print Section B: unmatched ────────────────────────────────────────────

  console.log("═".repeat(70));
  console.log(`[B] PEAKS WITH ASCENTS → NO OSM MATCH — MANUAL REVIEW (${unmatched.length})`);
  console.log("═".repeat(70));

  if (unmatched.length === 0) {
    console.log("  (none — all peaks with ascents have an OSM match ✅)\n");
  } else {
    for (const p of unmatched) {
      console.log(`\n  "${p.name}"  ${p.altitudeM}m`);
      console.log(`  id: ${p.id}`);
      console.log(`  coords: ${p.latitude}, ${p.longitude}`);
      console.log(`  ascents: ${p._ascentCount}`);
      console.log(`  Action: KEEP AS-IS until manually reviewed`);
    }
    console.log();
  }

  // ── Print Section C: no ascents ──────────────────────────────────────────

  console.log("═".repeat(70));
  console.log(`[C] PEAKS WITHOUT ASCENTS → WILL BE DELETED (${withoutAscents.length})`);
  console.log("═".repeat(70));
  console.log(`  ${withoutAscents.length} peaks with 0 ascents → safe to delete`);
  console.log(`  (not listing individually — run with --list-deletions to see all)\n`);

  if (process.argv.includes("--list-deletions")) {
    for (const p of withoutAscents) {
      console.log(`  DELETE: "${p.name}" ${p.altitudeM}m  (${p.id})`);
    }
    console.log();
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("═".repeat(70));
  console.log("SUMMARY");
  console.log("═".repeat(70));
  console.log(`  [A] ${matched.length}   peaks with ascents → matched to OSM → reassign + delete`);
  console.log(`  [B] ${unmatched.length}   peaks with ascents → NO match → keep for manual review`);
  console.log(`  [C] ${withoutAscents.length} peaks without ascents → delete`);
  console.log(`  [+] ${osmPeaks.length.toLocaleString()} OSM peaks → insert as new catalog`);
  console.log();
  console.log("  No changes made. Run execute-peaks-merge.ts --confirm to apply.");
}

main()
  .catch(err => { console.error("Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
