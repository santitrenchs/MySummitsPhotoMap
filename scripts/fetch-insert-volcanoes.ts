/**
 * fetch-insert-volcanoes.ts
 *
 * Fetches natural=volcano peaks (name + ele) and inserts them into prod.
 * Covers FR, IT, AT, ES — countries where volcanoes are tagged differently from peaks.
 *
 * Run:
 *   DATABASE_URL="..." npx tsx scripts/fetch-insert-volcanoes.ts
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];
const HEADERS = {
  "User-Agent": "PeakadexPeakFetcher/1.0 (https://peakadex.com; hello@peakadex.com)",
  "Referer": "https://peakadex.com",
};

// [south, west, north, east, country]
const BBOXES: [number, number, number, number, string][] = [
  [41.3, -5.5, 51.5,  9.6, "FR"],  // France mainland + Corsica
  [36.5,  6.5, 47.5, 18.5, "IT"],  // Italy (Etna, Vesuvius, Stromboli…)
  [46.3,  9.5, 49.0, 17.2, "AT"],  // Austria
  [36.0, -9.5, 43.8,  4.5, "ES"],  // Spain (Canarias)
];

function parseEle(raw: string): number | null {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : Math.round(n);
}

function getRarityId(alt: number): string {
  if (alt >= 8000) return "snow_lotus";
  if (alt >= 7000) return "cinquefoil";
  if (alt >= 5000) return "saxifrage";
  if (alt >= 3000) return "edelweiss";
  if (alt >= 1500) return "gentian";
  return "daisy";
}

async function fetchVolcanoes(south: number, west: number, north: number, east: number): Promise<any[]> {
  const query = `[out:json][timeout:60];node["natural"="volcano"]["name"]["ele"](${south},${west},${north},${east});out body;`;
  for (const mirror of MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: "POST", headers: HEADERS,
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) { console.log(`  ${res.status} on ${mirror}`); continue; }
      const data = await res.json() as any;
      return data.elements ?? [];
    } catch (e) { console.log(`  Error on ${mirror}: ${e}`); continue; }
  }
  return [];
}

async function main() {
  const existing = await prisma.peak.findMany({
    where: { osmId: { not: null } },
    select: { osmId: true },
  });
  const existingIds = new Set(existing.map(p => p.osmId!));
  console.log(`Existing osmIds in prod: ${existingIds.size}\n`);

  let totalInserted = 0;

  for (const [south, west, north, east, country] of BBOXES) {
    console.log(`Fetching volcanoes for ${country}…`);
    const elements = await fetchVolcanoes(south, west, north, east);
    console.log(`  ${elements.length} volcano nodes from Overpass`);

    const toInsert = elements
      .filter(el => !existingIds.has(String(el.id)))
      .map(el => {
        const tags = el.tags ?? {};
        const name = tags["name"]?.trim();
        const altitudeM = parseEle(tags["ele"] ?? "");
        if (!name || !altitudeM || altitudeM <= 0 || altitudeM > 9000) return null;
        return {
          id: randomUUID(), osmId: String(el.id), name,
          altitudeM, latitude: el.lat, longitude: el.lon,
          mountainRange: tags["mountain_range"] ?? tags["region"] ?? null,
          comarca: null, country, rarityId: getRarityId(altitudeM),
        };
      })
      .filter(Boolean) as any[];

    console.log(`  → ${toInsert.length} new volcanoes to insert`);

    if (toInsert.length > 0) {
      for (let i = 0; i < toInsert.length; i += 200) {
        await prisma.peak.createMany({ data: toInsert.slice(i, i + 200), skipDuplicates: true });
      }
      totalInserted += toInsert.length;
      toInsert.sort((a, b) => b.altitudeM - a.altitudeM).slice(0, 5)
        .forEach(p => console.log(`    ✅ ${p.name.padEnd(30)} ${p.altitudeM}m`));
    }
    await new Promise(r => setTimeout(r, 2_000));
  }

  const fr = await prisma.peak.count({ where: { country: "FR" } });
  const total = await prisma.peak.count();
  console.log(`\nTotal inserted: ${totalInserted}`);
  console.log(`FR peaks now: ${fr} | Total DB: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
