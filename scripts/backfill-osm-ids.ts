/**
 * Backfill osmId for existing peaks that don't have one.
 *
 * For each GPS-verified peak without osmId, queries Overpass within 500m
 * and matches the closest OSM node by name + altitude.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/backfill-osm-ids.ts
 *
 * Options (env vars):
 *   DRY_RUN=1        print matches without writing to DB
 *   ALL=1            also process non-GPS-verified peaks (less reliable coords)
 *   RADIUS=500       search radius in metres (default: 500)
 *   DELAY_MS=1100    pause between Overpass calls (default: 1100 — be polite)
 *   MIN_SCORE=0.6    minimum name similarity to accept a match (default: 0.6)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";
const ALL = process.env.ALL === "1";
const RADIUS = parseInt(process.env.RADIUS ?? "500");
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "1100");
const MIN_SCORE = parseFloat(process.env.MIN_SCORE ?? "0.6");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// ── Name normalisation (accent-insensitive, strips generic words) ─────────────

function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(pic|pico|punta|tuca|tuc|cap|mont|monte|cerro|serra|sierra|peak)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (!na || !nb) return 0;
  // Longest common subsequence ratio (simple SequenceMatcher-like)
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  let matches = 0;
  let si = 0;
  for (let i = 0; i < longer.length && si < shorter.length; i++) {
    if (longer[i] === shorter[si]) { matches++; si++; }
  }
  return (2 * matches) / (na.length + nb.length);
}

// ── Overpass query ─────────────────────────────────────────────────────────────

type OsmNode = { id: number; lat: number; lon: number; tags: Record<string, string> };

async function fetchNearbyPeaks(lat: number, lng: number): Promise<OsmNode[]> {
  const query = `[out:json][timeout:15];node["natural"="peak"](around:${RADIUS},${lat},${lng});out body;`;
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.elements ?? []) as OsmNode[];
}

// ── Match logic ────────────────────────────────────────────────────────────────

function bestMatch(
  peakName: string,
  peakAlt: number,
  nodes: OsmNode[]
): { node: OsmNode; score: number } | null {
  let best: { node: OsmNode; score: number } | null = null;

  for (const node of nodes) {
    const tags = node.tags ?? {};
    // All name variants in the OSM node
    const names = [
      tags.name, tags["name:es"], tags["name:ca"], tags["name:fr"],
      tags["name:en"], tags["name:de"], tags.alt_name, tags.official_name,
    ].filter(Boolean) as string[];

    const nameSim = Math.max(0, ...names.map((n) => similarity(peakName, n)));

    // Altitude bonus/penalty
    const ele = tags.ele ? parseFloat(tags.ele) : null;
    let altBonus = 0;
    if (ele != null && !isNaN(ele)) {
      const diff = Math.abs(peakAlt - ele);
      if (diff <= 50)  altBonus =  0.20;
      else if (diff <= 150) altBonus = 0.10;
      else if (diff <= 300) altBonus =  0.0;
      else if (diff <= 600) altBonus = -0.20;
      else altBonus = -0.40;
    }

    const score = nameSim + altBonus;
    if (!best || score > best.score) best = { node, score };
  }

  return best && best.score >= MIN_SCORE ? best : null;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const where = ALL
    ? { osmId: null }
    : { osmId: null, gpsVerified: true };

  const peaks = await prisma.peak.findMany({
    where,
    select: { id: true, name: true, altitudeM: true, latitude: true, longitude: true },
    orderBy: { name: "asc" },
  });

  const total = await prisma.peak.count();
  const alreadyDone = await prisma.peak.count({ where: { osmId: { not: null } } });

  console.log(`Peaks total:          ${total}`);
  console.log(`Already have osmId:   ${alreadyDone}`);
  console.log(`To process:           ${peaks.length}${ALL ? "" : " (GPS-verified only)"}`);
  if (DRY_RUN) console.log("DRY RUN — no writes\n");
  console.log("");

  let matched = 0;
  let noResult = 0;
  let lowScore = 0;
  let errors = 0;

  for (let i = 0; i < peaks.length; i++) {
    const peak = peaks[i];
    const prefix = `[${String(i + 1).padStart(4)}/${peaks.length}] ${peak.name.padEnd(30)}`;
    process.stdout.write(prefix);

    try {
      const nodes = await fetchNearbyPeaks(peak.latitude, peak.longitude);

      if (nodes.length === 0) {
        console.log("  — no OSM nodes nearby");
        noResult++;
      } else {
        const result = bestMatch(peak.name, peak.altitudeM, nodes);
        if (!result) {
          const best = nodes[0];
          console.log(`  ✗ low score  (best: "${best.tags?.name ?? "?"}", id=${best.id})`);
          lowScore++;
        } else {
          const osmUrl = `https://www.openstreetmap.org/node/${result.node.id}`;
          console.log(`  ✓ score=${result.score.toFixed(2)}  id=${result.node.id}  "${result.node.tags?.name ?? ""}"  ${osmUrl}`);
          if (!DRY_RUN) {
            await prisma.peak.update({
              where: { id: peak.id },
              data: { osmId: String(result.node.id) },
            }).catch((err: Error) => {
              // Unique constraint violation = another peak already has this osmId
              if (err.message.includes("Unique constraint")) {
                console.log(`     ⚠ osmId ${result.node.id} already used by another peak — skipped`);
              } else {
                throw err;
              }
            });
          }
          matched++;
        }
      }
    } catch (err) {
      console.log(`  ERROR: ${err}`);
      errors++;
    }

    if (i < peaks.length - 1) await sleep(DELAY_MS);
  }

  console.log("\n─────────────────────────────────────────────");
  console.log(`Matched:    ${matched}`);
  console.log(`No nearby:  ${noResult}`);
  console.log(`Low score:  ${lowScore}`);
  console.log(`Errors:     ${errors}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
