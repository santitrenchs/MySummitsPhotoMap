/**
 * fetch-osm-peaks-italy.ts
 *
 * Fetches all Italian peaks NOT covered by the Alps sync:
 *   Alps bbox covered: 46.5–48.5N, 9.5–15.0E
 *
 * Coverage (9 bboxes):
 *   1. NW Italy       — Valle d'Aosta, Piemonte, Liguria Alps
 *   2. N Italy Alps W — Lombardia Alps, Trentino S (south of 46.5N)
 *   3. N Italy Alps E — Veneto N, Friuli Pre-Alps (south of 46.5N)
 *   4. N Apennines    — Emilia-Romagna, N Toscana, Liguria
 *   5. C Apennines N  — Toscana, Umbria, Marche, Lazio N
 *   6. C Apennines S  — Lazio S, Abruzzo, Molise, Campania, Basilicata
 *   7. Calabria
 *   8. Sicily
 *   9. Sardinia
 *
 * Run:
 *   npx tsx scripts/fetch-osm-peaks-italy.ts
 *
 * Output: /tmp/italy-peaks.ndjson
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

// Alps sync covered 46.5–48.5N, 9.5–15.0E — fetch everything else in Italy
const BBOXES: [number, number, number, number, string][] = [
  // Northern Italy (Alps south of 46.5N + western Alps)
  [43.5,  6.5, 46.5,  9.5, "NW Italy (Valle d'Aosta, Piemonte, Liguria)"],
  [45.0,  9.5, 46.5, 12.5, "N Italy Alps W (Lombardia, Trentino S)"],
  [45.0, 12.5, 46.5, 14.0, "N Italy Alps E (Veneto N, Friuli)"],
  // Apennines
  [43.0,  9.5, 45.0, 13.5, "N Apennines (Emilia-Romagna, N Toscana)"],
  [41.5, 11.0, 43.5, 14.5, "C Apennines N (Toscana, Umbria, Marche, Lazio N)"],
  [39.0, 13.5, 42.0, 16.5, "C Apennines S (Abruzzo, Campania, Basilicata)"],
  [37.5, 15.5, 40.0, 17.0, "Calabria"],
  // Islands
  [36.5, 11.8, 38.5, 15.8, "Sicily"],
  [38.8,  8.0, 41.3, 10.2, "Sardinia"],
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
  console.error("Fetching Italian peaks (9 bboxes)…\n");

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
      country:       "IT",
      comarca:       comarcaFromTags(tags),
    });
  }

  peaks.sort((a, b) => b.altitudeM - a.altitudeM);
  for (const peak of peaks) process.stdout.write(JSON.stringify(peak) + "\n");

  console.error("─────────────────────────────────────────");
  console.error(`✅  Valid peaks: ${peaks.length}`);
  console.error(`⚠️   Skipped:    ${skipped.length}`);

  if (peaks.length > 0) {
    console.error(`\n🏔️  Top 10 highest:`);
    peaks.slice(0, 10).forEach((p, i) =>
      console.error(`    ${String(i + 1).padStart(2)}. ${p.name.padEnd(35)} ${String(p.altitudeM).padStart(5)} m`)
    );
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
