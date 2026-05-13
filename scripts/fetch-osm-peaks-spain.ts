/**
 * fetch-osm-peaks-spain.ts
 *
 * Queries the Overpass API for all natural=peak nodes in Spain
 * that have both a name AND an ele (elevation) tag.
 * Includes mainland + Canary Islands + Balearic Islands + Ceuta/Melilla.
 *
 * Run with:
 *   npx tsx scripts/fetch-osm-peaks-spain.ts
 *
 * Output: one JSON object per line (NDJSON) + a summary at the end.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

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
  osmId: string;           // OSM node ID as string  → Peak.osmId
  name: string;            // tag: name              → Peak.name
  altitudeM: number;       // tag: ele (rounded)     → Peak.altitudeM
  latitude: number;        // OSM lat                → Peak.latitude
  longitude: number;       // OSM lon                → Peak.longitude
  mountainRange: string | null; // tag: mountain_range or description → Peak.mountainRange
  country: string;         // always "ES"            → Peak.country
  comarca: string | null;  // tag: is_in:comarca     → Peak.comarca
  // Extra OSM tags kept for reference, not part of Peak schema
  _osm: {
    wikipedia?: string;
    wikidata?: string;
    nameEs?: string;
    nameCa?: string;
    prominence?: number | null;
    saddle_type?: string;
  };
}

// ── Overpass query ────────────────────────────────────────────────────────────
//
// Fetches natural=peak nodes inside the area of Spain (ISO3166-1=ES).
// Using area-based query covers mainland + islands automatically.
// We filter server-side to nodes that have [name][ele] so the response
// is already trimmed before we parse it.

// Multiple mirrors — tried in order until one responds
const OVERPASS_MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

const HEADERS = {
  "User-Agent": "AziTracksPeakFetcher/1.0 (https://aziatlas.com; contact@aziatlas.com)",
  "Referer": "https://aziatlas.com",
};

const QUERY = `
[out:json][timeout:120];
area["ISO3166-1"="ES"][admin_level=2]->.spain;
(
  node["natural"="peak"]["name"]["ele"](area.spain);
);
out body;
`.trim();

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseEle(raw: string): number | null {
  // ele can be "2592", "2592 m", "2592.5", "2,592" etc.
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(n);
}

function mountainRangeFromTags(tags: Record<string, string>): string | null {
  return (
    tags["mountain_range"] ??
    tags["region"] ??
    tags["is_in:mountain_range"] ??
    null
  );
}

function comarcaFromTags(tags: Record<string, string>): string | null {
  return (
    tags["is_in:comarca"] ??
    tags["addr:county"] ??
    null
  );
}

function prominenceFromTags(tags: Record<string, string>): number | null {
  const raw = tags["prominence"] ?? tags["prom"];
  if (!raw) return null;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : Math.round(n);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.error("Querying Overpass API for Spain peaks (name + ele)…");
  console.error("This may take 30–90 seconds depending on server load.\n");

  let res: Response | null = null;
  for (const mirror of OVERPASS_MIRRORS) {
    console.error(`  Trying ${mirror} …`);
    // Try POST first (avoids URL length limits), then GET as fallback
    for (const method of ["POST", "GET"] as const) {
      try {
        res = method === "POST"
          ? await fetch(mirror, {
              method: "POST",
              headers: HEADERS,
              body: `data=${encodeURIComponent(QUERY)}`,
            })
          : await fetch(`${mirror}?data=${encodeURIComponent(QUERY)}`, { headers: HEADERS });

        if (res.ok) { console.error(`  ✓ OK (${method})\n`); break; }
        if (res.status === 429) {
          console.error(`  429 rate-limited — waiting 10 s before retry…`);
          await new Promise(r => setTimeout(r, 10_000));
          res = await fetch(mirror, {
            method: "POST",
            headers: HEADERS,
            body: `data=${encodeURIComponent(QUERY)}`,
          });
          if (res.ok) { console.error("  ✓ OK (POST retry)\n"); break; }
        }
        console.error(`  HTTP ${res.status} (${method})`);
        res = null;
      } catch (e) {
        console.error(`  Network error (${method}): ${e}`);
        res = null;
      }
    }
    if (res) break;
    console.error(`  Skipping to next mirror.\n`);
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
    if (!name) {
      skipped.push({ id: el.id, reason: "no name tag" });
      continue;
    }

    const altitudeM = parseEle(tags["ele"] ?? "");
    if (altitudeM === null) {
      skipped.push({ id: el.id, reason: `unparseable ele="${tags["ele"]}"` });
      continue;
    }

    if (altitudeM <= 0 || altitudeM > 9000) {
      skipped.push({ id: el.id, reason: `ele out of range: ${altitudeM}` });
      continue;
    }

    peaks.push({
      osmId:         String(el.id),
      name,
      altitudeM,
      latitude:      el.lat,
      longitude:     el.lon,
      mountainRange: mountainRangeFromTags(tags),
      country:       "ES",
      comarca:       comarcaFromTags(tags),
      _osm: {
        wikipedia:  tags["wikipedia"],
        wikidata:   tags["wikidata"],
        nameEs:     tags["name:es"],
        nameCa:     tags["name:ca"],
        prominence: prominenceFromTags(tags),
        saddle_type: tags["saddle_type"],
      },
    });
  }

  // Sort by altitude descending
  peaks.sort((a, b) => b.altitudeM - a.altitudeM);

  // ── Output ──────────────────────────────────────────────────────────────────

  // One JSON per line (NDJSON) — easy to pipe, grep, import
  for (const peak of peaks) {
    process.stdout.write(JSON.stringify(peak) + "\n");
  }

  // Summary to stderr so it doesn't pollute the NDJSON output
  console.error("\n─────────────────────────────────────────");
  console.error(`✅  Valid peaks:   ${peaks.length}`);
  console.error(`⚠️   Skipped:       ${skipped.length}`);
  if (skipped.length > 0) {
    const sample = skipped.slice(0, 5);
    console.error(`    (first ${sample.length} skipped: ${JSON.stringify(sample)})`);
  }

  const withRange    = peaks.filter(p => p.mountainRange).length;
  const withWiki     = peaks.filter(p => p._osm.wikipedia).length;
  const withWikidata = peaks.filter(p => p._osm.wikidata).length;
  const above1000    = peaks.filter(p => p.altitudeM > 1000).length;
  const above2000    = peaks.filter(p => p.altitudeM > 2000).length;
  const above3000    = peaks.filter(p => p.altitudeM > 3000).length;

  console.error(`\n📊  Stats:`);
  console.error(`    With mountain_range:  ${withRange}`);
  console.error(`    With Wikipedia tag:   ${withWiki}`);
  console.error(`    With Wikidata tag:    ${withWikidata}`);
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
