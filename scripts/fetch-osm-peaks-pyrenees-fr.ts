/**
 * fetch-osm-peaks-pyrenees-fr.ts
 *
 * Queries the Overpass API for natural=peak nodes in the French Pyrenees
 * (bbox covering the French side of the range).
 *
 * Run with:
 *   npx tsx scripts/fetch-osm-peaks-pyrenees-fr.ts
 *
 * Output: one JSON object per line (NDJSON) + a summary at the end.
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

// French Pyrenees bbox: 42.3S to catch all French peaks (Canigó, Torre d'Eina, Carlit)
// Border peaks already in DB as ES will be skipped via osmId pre-load in sync script
const QUERY = `
[out:json][timeout:120];
node["natural"="peak"]["name"]["ele"](42.3,-2.0,43.7,3.5);
out body;
`.trim();

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

async function main() {
  console.error("Querying Overpass API for French Pyrenees peaks…");

  let res: Response | null = null;
  for (const mirror of OVERPASS_MIRRORS) {
    console.error(`  Trying ${mirror} …`);
    try {
      res = await fetch(mirror, {
        method: "POST",
        headers: HEADERS,
        body: `data=${encodeURIComponent(QUERY)}`,
      });
      if (res.ok) { console.error(`  ✓ OK\n`); break; }
      if (res.status === 429) {
        console.error(`  429 rate-limited — waiting 10s…`);
        await new Promise(r => setTimeout(r, 10_000));
        res = await fetch(mirror, { method: "POST", headers: HEADERS, body: `data=${encodeURIComponent(QUERY)}` });
        if (res.ok) { console.error(`  ✓ OK (retry)\n`); break; }
      }
      console.error(`  HTTP ${res.status}`);
      res = null;
    } catch (e) {
      console.error(`  Network error: ${e}`);
      res = null;
    }
  }

  if (!res) throw new Error("All Overpass mirrors failed.");

  const data = (await res.json()) as OverpassResponse;
  const elements = data.elements ?? [];
  console.error(`Raw OSM nodes returned: ${elements.length}`);

  const peaks: PeakRow[] = [];
  const skipped: { id: number; reason: string }[] = [];

  for (const el of elements) {
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

  const withRange = peaks.filter(p => p.mountainRange).length;
  const above1000 = peaks.filter(p => p.altitudeM > 1000).length;
  const above2000 = peaks.filter(p => p.altitudeM > 2000).length;
  const above3000 = peaks.filter(p => p.altitudeM > 3000).length;

  console.error(`\n📊  Stats:`);
  console.error(`    With mountain_range:  ${withRange}`);
  console.error(`    > 1000 m:             ${above1000}`);
  console.error(`    > 2000 m:             ${above2000}`);
  console.error(`    > 3000 m:             ${above3000}`);

  if (peaks.length > 0) {
    console.error(`\n🏔️  Top 10 highest:`);
    peaks.slice(0, 10).forEach((p, i) => {
      console.error(`    ${String(i + 1).padStart(2)}. ${p.name.padEnd(30)} ${String(p.altitudeM).padStart(5)} m  (OSM ${p.osmId})`);
    });
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
