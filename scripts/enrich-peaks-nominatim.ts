/**
 * enrich-peaks-nominatim.ts
 *
 * Enriches peaks in DB with comarca + mountainRange + country via Nominatim.
 * Saves progress to a checkpoint file so it can be paused and resumed.
 *
 * Batches DB writes every BATCH_SIZE peaks (default 100) to minimize
 * the number of DB connections and reduce Railway proxy instability.
 *
 * Run:
 *   DATABASE_URL="..." npx tsx scripts/enrich-peaks-nominatim.ts
 *   DATABASE_URL="..." npx tsx scripts/enrich-peaks-nominatim.ts --country=ALPS
 *   DATABASE_URL="..." npx tsx scripts/enrich-peaks-nominatim.ts --limit=100 --dry-run
 *
 * Flags:
 *   --country=XX  process only peaks with this country code
 *   --limit=N     process only N peaks (for testing)
 *   --dry-run     show results without writing to DB
 *   --reset       ignore checkpoint and start from scratch
 *
 * Anti-hang measures:
 *   1. Nominatim: AbortController (12s) + Promise.race guard (20s)
 *   2. flushBatch: Promise.race guard (60s) + retry on all DB conn errors
 *   3. Retry backoff: 15s / 30s / 45s (instead of 30/60/90 — less total hang time)
 */

import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync, writeFileSync } from "fs";

const prisma = new PrismaClient();

const CHECKPOINT_FILE = "/tmp/nominatim-progress.json";
const RATE_LIMIT_MS   = 1100;  // Nominatim policy: max 1 req/sec
const BATCH_SIZE      = 100;   // flush to DB every N peaks
const FLUSH_TIMEOUT   = 60_000; // max ms to wait for a DB flush before retrying

const isDryRun  = process.argv.includes("--dry-run");
const isReset   = process.argv.includes("--reset");
const limitArg  = process.argv.find(a => a.startsWith("--limit"));
const limit     = limitArg ? parseInt(limitArg.split("=")[1] ?? process.argv[process.argv.indexOf(limitArg) + 1]) : null;
const countryArg = process.argv.find(a => a.startsWith("--country"));
const country   = countryArg ? (countryArg.split("=")[1] ?? process.argv[process.argv.indexOf(countryArg) + 1]) : null;

// ── Nominatim ─────────────────────────────────────────────────────────────────

interface NominatimAddr {
  countryCode: string;
  county:      string;
  state:       string;
}

async function reverseGeocode(lat: number, lon: number): Promise<NominatimAddr | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=10`;

  // AbortController + manual timer: more reliable than AbortSignal.timeout()
  // across all Node.js versions and network edge cases (e.g. body hangs).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PeakadexPeakEnricher/1.0 (https://peakadex.com)" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json() as { address?: Record<string, string> };
    const addr = data.address ?? {};
    return {
      countryCode: addr.country_code?.toUpperCase() ?? "",
      county:      addr.county ?? addr.comarca ?? addr.municipality ?? addr.town ?? addr.village ?? "",
      state:       addr.state ?? addr.region ?? "",
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Safety net: if reverseGeocode somehow hangs beyond 20s, resolve null anyway.
function reverseGeocodeWithGuard(lat: number, lon: number): Promise<NominatimAddr | null> {
  return Promise.race([
    reverseGeocode(lat, lon),
    new Promise<null>(resolve => setTimeout(() => resolve(null), 20_000)),
  ]);
}

// ── Checkpoint ────────────────────────────────────────────────────────────────

function loadCheckpoint(): Set<string> {
  if (isReset || !existsSync(CHECKPOINT_FILE)) return new Set();
  try {
    const data = JSON.parse(readFileSync(CHECKPOINT_FILE, "utf8")) as { done: string[] };
    return new Set(data.done);
  } catch { return new Set(); }
}

function saveCheckpoint(done: Set<string>) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify({ done: [...done] }));
}

// ── DB flush with retry + timeout guard ──────────────────────────────────────

interface PendingUpdate {
  id:           string;
  comarca:      string | null;
  mountainRange: string | null;
  country:      string | null;
}

function isDbConnError(e: any): boolean {
  return (
    e.code === "P1017" || e.code === "P1001" || e.code === "P2024" ||
    e.message?.includes("Can't reach database") ||
    e.message?.includes("Server has closed") ||
    e.message?.includes("connection pool") ||
    e.message?.includes("Connection refused")
  );
}

async function flushBatchOnce(batch: PendingUpdate[]): Promise<void> {
  await prisma.$transaction(
    batch.map(u => prisma.peak.update({
      where: { id: u.id },
      data: {
        comarca:       u.comarca       ?? undefined,
        mountainRange: u.mountainRange ?? undefined,
        ...(u.country ? { country: u.country } : {}),
      },
    }))
  );
}

async function flushBatch(batch: PendingUpdate[]): Promise<void> {
  if (batch.length === 0) return;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // Wrap the transaction in a timeout so a hung DB call doesn't block forever
      await Promise.race([
        flushBatchOnce(batch),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("flushBatch timeout")), FLUSH_TIMEOUT)
        ),
      ]);
      return; // success
    } catch (e: any) {
      const retriable = isDbConnError(e) || e.message === "flushBatch timeout";

      if (retriable && attempt < 5) {
        const waitSec = attempt * 15; // 15s / 30s / 45s / 60s — faster than before
        console.log(`\n  [DB error (${e.code ?? e.message?.slice(0, 40)}) — waiting ${waitSec}s before retry ${attempt}/5…]`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        await prisma.$disconnect().catch(() => {});
        await prisma.$connect().catch(() => {});
      } else {
        throw e;
      }
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "WRITE"}${limit ? ` | Limit: ${limit}` : ""}  |  Batch: ${BATCH_SIZE}\n`);
  if (country) console.log(`Filtering by country: ${country}\n`);

  const done = loadCheckpoint();
  if (done.size > 0) console.log(`Resuming from checkpoint — ${done.size} already processed\n`);

  const peaks = await prisma.peak.findMany({
    where: {
      OR: [{ comarca: null }, { mountainRange: null }],
      ...(country ? { country } : {}),
    },
    select: { id: true, name: true, altitudeM: true, latitude: true, longitude: true },
    orderBy: { altitudeM: "desc" },
    take: limit ?? undefined,
  });

  const pending = peaks.filter(p => !done.has(p.id));
  console.log(`Peaks to enrich: ${pending.length} (of ${peaks.length} fetched)\n`);

  let processed = 0;
  let updated   = 0;
  let failed    = 0;
  let batch: PendingUpdate[] = [];

  console.log("─".repeat(80));
  console.log(`${"Name".padEnd(35)} ${"Alt".padStart(5)}  ${"Comarca".padEnd(20)}  ${"Cordillera"}`);
  console.log("─".repeat(80));

  for (const peak of pending) {
    const addr = await reverseGeocodeWithGuard(peak.latitude, peak.longitude);

    const comarca       = addr?.county || null;
    const mountainRange = addr?.state  || null;

    console.log(
      `${peak.name.slice(0, 34).padEnd(35)} ${String(peak.altitudeM).padStart(5)}m` +
      `  ${(comarca ?? "—").slice(0, 19).padEnd(20)}  ${mountainRange ?? "—"}`
    );

    if (!isDryRun && addr) {
      batch.push({
        id: peak.id,
        comarca,
        mountainRange,
        country: addr.countryCode || null,
      });
    }

    done.add(peak.id);
    processed++;
    if (addr === null) failed++;

    // Flush batch every BATCH_SIZE peaks
    if (batch.length >= BATCH_SIZE) {
      await flushBatch(batch);
      updated += batch.length;
      batch = [];
      saveCheckpoint(done);
      console.log(`\n  [checkpoint saved — ${processed}/${pending.length} | flushed ${BATCH_SIZE} to DB]\n`);
    }

    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  // Flush remaining
  if (batch.length > 0) {
    await flushBatch(batch);
    updated += batch.length;
  }

  saveCheckpoint(done);

  console.log("─".repeat(80));
  console.log(`\nProcessed: ${processed}  |  Updated: ${updated}  |  Failed: ${failed}`);
  if (isDryRun) console.log("(dry-run — no changes written to DB)");
}

main()
  .catch(err => { console.error("Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
