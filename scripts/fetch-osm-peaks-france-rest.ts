/**
 * fetch-osm-peaks-france-rest.ts
 *
 * Fetches French peaks NOT covered by previous syncs:
 *   - Pyrenees FR  (fetch-osm-peaks-pyrenees-fr.ts)  bbox 42.3–43.7N, -2.0–3.5E
 *   - Alps         (fetch-osm-peaks-alps.ts)          bbox 43.5–48.5N,  5.5–17E
 *
 * Covered here (6 bboxes):
 *   1. Massif Central Sud   — Cévennes, Auvergne S, Languedoc interior
 *   2. Massif Central Nord  — Auvergne N, Morvan, Bourgogne
 *   3. Jura                 — Crêt de la Neige, Monts du Jura
 *   4. Vosges               — Grand Ballon, Hohneck
 *   5. Nord France          — Bretagne, Normandie, Ardennes (low density)
 *   6. Corsica              — Monte Cinto, Monte Rotondo, Paglia Orba
 *
 * Deduplicates by osmId so overlapping bboxes don't produce duplicates.
 *
 * Run:
 *   npx tsx scripts/fetch-osm-peaks-france-rest.ts
 *
 * Output: /tmp/france-rest-peaks.ndjson
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
  _osm: {
    wikipedia?: string;
    wikidata?: string;
    nameFr?: string;
    nameOc?: string;
    prominence?: number | null;
  };
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

// 6 bboxes covering all remaining French territory
// Format: [south, west, north, east, label]
const BBOXES: [number, number, number, number, string][] = [
  [43.7,  1.5, 45.2,  5.5, "Massif Central Sud"],
  [45.2,  1.5, 47.0,  5.5, "Massif Central Nord"],
  [46.0,  5.5, 47.5,  6.8, "Jura"],
  [47.0,  6.5, 49.0,  7.6, "Vosges"],
  [47.0, -5.5, 51.5,  6.5, "Nord France"],
  [41.3,  8.5, 43.1,  9.6, "Corsica"],
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

function prominenceFromTags(tags: Record<string, string>): number | null {
  const raw = tags["prominence"] ?? tags["prom"];
  if (!raw) return null;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : Math.round(n);
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
        console.error(`    429 rate-limited on ${mirror} — waiting 15s…`);
        await new Promise(r => setTimeout(r, 15_000));
        continue;
      }
      if (!res.ok) {
        console.error(`    HTTP ${res.status} on ${mirror}`);
        continue;
      }

      const data = (await res.json()) as OverpassResponse;
      if (data.remark?.includes("timed out")) {
        console.error(`    Timeout on ${mirror}`);
        continue;
      }

      return data.elements ?? [];
    } catch (e) {
      console.error(`    Network error on ${mirror}: ${e}`);
    }
  }

  throw new Error(`All mirrors failed for bbox ${label}`);
}

async function main() {
  console.error("Fetching remaining France peaks across 6 bboxes…\n");

  const seen = new Set<number>();
  const allElements: OsmElement[] = [];

  for (const [south, west, north, east, label] of BBOXES) {
    console.error(`  [${label}] (${south},${west} → ${north},${east})…`);
    const elements = await fetchBbox(south, west, north, east, label);
    let newCount = 0;
    for (const el of elements) {
      if (!seen.has(el.id)) {
        seen.add(el.id);
        allElements.push(el);
        newCount++;
      }
    }
    console.error(`    → ${elements.length} nodes, ${newCount} new (${elements.length - newCount} duplicates)\n`);
    await new Promise(r => setTimeout(r, 2_000));
  }

  console.error(`Total unique OSM nodes: ${allElements.length}\n`);

  const peaks: PeakRow[] = [];
  const skipped: { id: number; reason: string }[] = [];

  for (const el of allElements) {
    const tags = el.tags ?? {};
    const name = tags["name"]?.trim();
    if (!name) { skipped.push({ id: el.id, reason: "no name tag" }); continue; }

    const altitudeM = parseEle(tags["ele"] ?? "");
    if (altitudeM === null) { skipped.push({ id: el.id, reason: `unparseable ele="${tags["ele"]}"` }); continue; }
    if (altitudeM <= 0 || altitudeM > 9000) { skipped.push({ id: el.id, reason: `ele out of range: ${altitudeM}` }); continue; }

    peaks.push({
      osmId:         String(el.id),
      name,
      altitudeM,
      latitude:      el.lat,
      longitude:     el.lon,
      mountainRange: mountainRangeFromTags(tags),
      country:       "FR",
      comarca:       comarcaFromTags(tags),
      _osm: {
        wikipedia:  tags["wikipedia"],
        wikidata:   tags["wikidata"],
        nameFr:     tags["name:fr"],
        nameOc:     tags["name:oc"],
        prominence: prominenceFromTags(tags),
      },
    });
  }

  peaks.sort((a, b) => b.altitudeM - a.altitudeM);

  for (const peak of peaks) {
    process.stdout.write(JSON.stringify(peak) + "\n");
  }

  console.error("\n─────────────────────────────────────────");
  console.error(`✅  Valid peaks:   ${peaks.length}`);
  console.error(`⚠️   Skipped:       ${skipped.length}`);

  const above1000 = peaks.filter(p => p.altitudeM > 1000).length;
  const above2000 = peaks.filter(p => p.altitudeM > 2000).length;

  console.error(`\n📊  Stats:`);
  console.error(`    > 1000 m: ${above1000}`);
  console.error(`    > 2000 m: ${above2000}`);

  if (peaks.length > 0) {
    console.error(`\n🏔️  Top 10 highest:`);
    peaks.slice(0, 10).forEach((p, i) => {
      console.error(`    ${String(i + 1).padStart(2)}. ${p.name.padEnd(35)} ${String(p.altitudeM).padStart(5)} m  (OSM ${p.osmId})`);
    });
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
