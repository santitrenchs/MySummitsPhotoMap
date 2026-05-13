/**
 * fill-gaps.ts — fetches a bbox from Overpass and inserts peaks missing from prod.
 *
 * Run:
 *   BBOX="s,w,n,e" COUNTRY="FR" LABEL="region name" DATABASE_URL="..." npx tsx scripts/fill-gaps.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const MIRRORS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const HEADERS = { "User-Agent": "PeakadexFetcher/1.0 (https://peakadex.com)" };

const [s, w, n, e] = (process.env.BBOX ?? "").split(",").map(Number);
const COUNTRY = process.env.COUNTRY ?? "FR";
const LABEL   = process.env.LABEL ?? process.env.BBOX ?? "?";

function parseEle(raw: string): number | null {
  const v = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(v) ? null : Math.round(v);
}
function getRarityId(alt: number): string {
  if (alt >= 8000) return "snow_lotus";
  if (alt >= 7000) return "cinquefoil";
  if (alt >= 5000) return "saxifrage";
  if (alt >= 3000) return "edelweiss";
  if (alt >= 1500) return "gentian";
  return "daisy";
}

async function fetchBbox(): Promise<any[]> {
  const q = `[out:json][timeout:120];(node["natural"="peak"]["name"]["ele"](${s},${w},${n},${e});node["natural"="volcano"]["name"]["ele"](${s},${w},${n},${e}););out body;`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const mirror = MIRRORS[attempt % MIRRORS.length];
    try {
      const res = await fetch(mirror, { method: "POST", headers: HEADERS, body: `data=${encodeURIComponent(q)}` });
      if (!res.ok) { console.log(`  ${res.status} on ${mirror}`); await new Promise(r => setTimeout(r, 15_000)); continue; }
      const data = await res.json() as any;
      if (data.remark?.includes("timed out")) { await new Promise(r => setTimeout(r, 15_000)); continue; }
      return data.elements ?? [];
    } catch (e) { console.log(`  Error: ${e}`); await new Promise(r => setTimeout(r, 15_000)); }
  }
  throw new Error("All mirrors failed");
}

async function main() {
  console.log(`Fetching [${LABEL}] bbox=(${s},${w},${n},${e}) country=${COUNTRY}…`);
  const elements = await fetchBbox();
  console.log(`  ${elements.length} nodes from Overpass`);

  const existing = await prisma.peak.findMany({ where: { osmId: { not: null } }, select: { osmId: true } });
  const existingIds = new Set(existing.map(p => p.osmId!));
  console.log(`  ${existingIds.size} osmIds already in DB`);

  const toInsert = elements
    .filter(el => !existingIds.has(String(el.id)))
    .map(el => {
      const tags = el.tags ?? {};
      const name = tags["name"]?.trim();
      const altitudeM = parseEle(tags["ele"] ?? "");
      if (!name || !altitudeM || altitudeM <= 0 || altitudeM > 9000) return null;
      return {
        id: randomUUID(), osmId: String(el.id), name, altitudeM,
        latitude: el.lat, longitude: el.lon,
        mountainRange: tags["mountain_range"] ?? tags["region"] ?? null,
        comarca: null, country: COUNTRY, rarityId: getRarityId(altitudeM),
      };
    }).filter(Boolean) as any[];

  console.log(`  ${toInsert.length} new peaks to insert\n`);
  if (toInsert.length === 0) { console.log("Nothing to do."); return; }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 500) {
    await prisma.peak.createMany({ data: toInsert.slice(i, i + 500), skipDuplicates: true });
    inserted += Math.min(500, toInsert.length - i);
    process.stdout.write(`\r  Inserted ${inserted}/${toInsert.length}…`);
  }
  process.stdout.write("\n");

  toInsert.sort((a: any, b: any) => b.altitudeM - a.altitudeM).slice(0, 5)
    .forEach((p: any) => console.log(`    ✅ ${p.name.padEnd(30)} ${p.altitudeM}m`));

  const total = await prisma.peak.count();
  const countryCount = await prisma.peak.count({ where: { country: COUNTRY } });
  console.log(`\nTotal DB: ${total.toLocaleString()} | ${COUNTRY}: ${countryCount.toLocaleString()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
