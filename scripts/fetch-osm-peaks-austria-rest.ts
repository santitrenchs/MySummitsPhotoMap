/**
 * fetch-osm-peaks-austria-rest.ts
 *
 * Fetches Austrian peaks NOT covered by the Alps sync:
 *   Alps bboxes covered: 46.5–48.5N, 9.5–15.0E
 *
 * Missing areas (2 bboxes):
 *   1. Austria East  — Burgenland, Steiermark E, Lower Austria E, Vienna
 *   2. Austria North — Upper/Lower Austria north of 48.5N
 *
 * Run:
 *   npx tsx scripts/fetch-osm-peaks-austria-rest.ts
 *
 * Output: /tmp/austria-rest-peaks.ndjson
 */

interface OsmElement {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface OverpassResponse {
  elements: OsmElement[];
  remark?: string;
}

interface PeakRow {
  osmId: string;
  name: string;
  altitudeM: number;
  latitude: number;
  longitude: number;
  mountainRange: string | null;
  country: string;
  comarca: string | null;
}

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

const HEADERS = {
  "User-Agent": "PeakadexPeakFetcher/1.0 (https://peakadex.com; hello@peakadex.com)",
  "Referer": "https://peakadex.com",
};

// Alps bboxes covered 46.5–48.5N, 9.5–15.0E — fetch what's outside
const BBOXES: [number, number, number, number, string][] = [
  [46.3, 15.0, 49.0, 17.2, "Austria East (Burgenland, Vienna, Steiermark E)"],
  [48.4,  9.5, 49.0, 15.0, "Austria North (Upper/Lower Austria N)"],
];

function buildQuery(south: number, west: number, north: number, east: number): string {
  return `[out:json][timeout:120];
node["natural"="peak"]["name"]["ele"](${south},${west},${north},${east});
out body;`.trim();
}

function parseEle(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(n);
}

function mountainRangeFromTags(tags: Record<string, string>): string | null {
  return tags["mountain_range"] ?? tags["region"] ?? tags["is_in:mountain_range"] ?? null;
}

function comarcaFromTags(tags: Record<string, string>): string | null {
  return tags["is_in:comarca"] ?? tags["addr:county"] ?? null;
}

async function fetchBbox(
  south: number, west: number, north: number, east: number, label: string
): Promise<OsmElement[]> {
  const query = buildQuery(south, west, north, east);

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: "POST",
        headers: HEADERS,
        body: `data=${encodeURIComponent(query)}`,
      });
      if (res.status === 429) {
        console.error(`    429 on ${mirror} — waiting 15s…`);
        await new Promise(r => setTimeout(r, 15_000));
        continue;
      }
      if (!res.ok) { console.error(`    HTTP ${res.status} on ${mirror}`); continue; }
      const data = (await res.json()) as OverpassResponse;
      if (data.remark?.includes("timed out")) { console.error(`    Timeout on ${mirror}`); continue; }
      return data.elements ?? [];
    } catch (e) {
      console.error(`    Network error on ${mirror}: ${e}`);
    }
  }
  throw new Error(`All mirrors failed for bbox ${label}`);
}

async function main() {
  console.error("Fetching remaining Austria peaks (2 bboxes)…\n");

  const seen = new Set<number>();
  const allElements: OsmElement[] = [];

  for (const [south, west, north, east, label] of BBOXES) {
    console.error(`  [${label}]…`);
    const elements = await fetchBbox(south, west, north, east, label);
    let newCount = 0;
    for (const el of elements) {
      if (!seen.has(el.id)) { seen.add(el.id); allElements.push(el); newCount++; }
    }
    console.error(`    → ${elements.length} nodes, ${newCount} new\n`);
    await new Promise(r => setTimeout(r, 2_000));
  }

  console.error(`Total unique OSM nodes: ${allElements.length}\n`);

  const peaks: PeakRow[] = [];
  const skipped: { id: number; reason: string }[] = [];

  for (const el of allElements) {
    const tags = el.tags ?? {};
    const name = tags["name"]?.trim();
    if (!name) { skipped.push({ id: el.id, reason: "no name" }); continue; }
    const altitudeM = parseEle(tags["ele"] ?? "");
    if (altitudeM === null) { skipped.push({ id: el.id, reason: `bad ele="${tags["ele"]}"` }); continue; }
    if (altitudeM <= 0 || altitudeM > 9000) { skipped.push({ id: el.id, reason: `out of range: ${altitudeM}` }); continue; }

    peaks.push({
      osmId:         String(el.id),
      name,
      altitudeM,
      latitude:      el.lat,
      longitude:     el.lon,
      mountainRange: mountainRangeFromTags(tags),
      country:       "AT",
      comarca:       comarcaFromTags(tags),
    });
  }

  peaks.sort((a, b) => b.altitudeM - a.altitudeM);
  for (const peak of peaks) process.stdout.write(JSON.stringify(peak) + "\n");

  console.error("─────────────────────────────────────────");
  console.error(`✅  Valid peaks: ${peaks.length}`);
  console.error(`⚠️   Skipped:    ${skipped.length}`);

  if (peaks.length > 0) {
    console.error(`\n🏔️  Top 5 highest:`);
    peaks.slice(0, 5).forEach((p, i) =>
      console.error(`    ${i + 1}. ${p.name.padEnd(35)} ${String(p.altitudeM).padStart(5)} m`)
    );
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
