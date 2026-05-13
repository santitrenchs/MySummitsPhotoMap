/**
 * copy-enrichment-staging-to-prod.ts
 *
 * Copies comarca + mountainRange + country from staging to production
 * by matching on osmId. Much faster than re-running Nominatim.
 *
 * Run:
 *   npx tsx scripts/copy-enrichment-staging-to-prod.ts [--country=IT] [--dry-run]
 *
 * Flags:
 *   --country=XX  copy only peaks with this country code (in staging)
 *   --dry-run     show stats without writing to prod
 */

import { PrismaClient } from "@prisma/client";

const STAGING_URL = "postgresql://postgres:xmVtDdJhLyLbscHEODpBxStXcyLEhIPw@turntable.proxy.rlwy.net:38589/railway";
const PROD_URL    = "postgresql://postgres:ixPXXcoeuHbjWLjkvgQPOJbUYvyOKyKa@metro.proxy.rlwy.net:10046/railway";

const staging = new PrismaClient({ datasources: { db: { url: STAGING_URL } } });
const prod    = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

const DRY_RUN    = process.argv.includes("--dry-run");
const countryArg = process.argv.find(a => a.startsWith("--country="));
const country    = countryArg ? countryArg.split("=")[1] : null;

const BATCH = 100;

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "WRITE"}${country ? ` | Country: ${country}` : " | All countries"}\n`);

  // Load enriched peaks from staging (osmId + enrichment data)
  console.log("Loading enriched peaks from staging…");
  const stagingPeaks = await staging.peak.findMany({
    where: {
      osmId: { not: null },
      OR: [{ comarca: { not: null } }, { mountainRange: { not: null } }],
      ...(country ? { country } : {}),
    },
    select: {
      osmId: true,
      comarca: true,
      mountainRange: true,
      country: true,
    },
  });
  console.log(`  ${stagingPeaks.length.toLocaleString()} enriched peaks in staging\n`);

  // Build lookup map
  const stagingMap = new Map(stagingPeaks.map(p => [p.osmId!, p]));

  // Load matching peaks from prod (by osmId)
  console.log("Loading matching peaks from prod…");
  const prodPeaks = await prod.peak.findMany({
    where: {
      osmId: { in: [...stagingMap.keys()] },
      OR: [{ comarca: null }, { mountainRange: null }],
    },
    select: { id: true, osmId: true, comarca: true, mountainRange: true, country: true },
  });
  console.log(`  ${prodPeaks.length.toLocaleString()} prod peaks needing enrichment\n`);

  if (prodPeaks.length === 0) {
    console.log("Nothing to update — all prod peaks already enriched.");
    return;
  }

  // Build update list
  const updates = prodPeaks
    .map(p => {
      const s = stagingMap.get(p.osmId!);
      if (!s) return null;
      return { id: p.id, comarca: s.comarca, mountainRange: s.mountainRange, country: s.country };
    })
    .filter(Boolean) as { id: string; comarca: string | null; mountainRange: string | null; country: string | null }[];

  console.log(`Updates to apply: ${updates.length.toLocaleString()}`);
  if (DRY_RUN) {
    console.log("\nSample (first 5):");
    updates.slice(0, 5).forEach(u => console.log(`  ${u.id}  comarca=${u.comarca ?? "—"}  range=${u.mountainRange ?? "—"}  country=${u.country ?? "—"}`));
    console.log("\n(dry-run — no changes written to prod)");
    return;
  }

  // Apply in batches with retry on connection errors
  let updated = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await Promise.race([
          prod.$transaction(
            batch.map(u => prod.peak.update({
              where: { id: u.id },
              data: {
                comarca:       u.comarca       ?? undefined,
                mountainRange: u.mountainRange ?? undefined,
                ...(u.country ? { country: u.country } : {}),
              },
            }))
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("batch timeout")), 60_000)
          ),
        ]);
        break; // success
      } catch (e: any) {
        const retriable = ["P1017","P1001","P2024"].includes(e.code) ||
          e.message?.includes("closed") || e.message?.includes("pool") ||
          e.message === "batch timeout";
        if (retriable && attempt < 5) {
          const wait = attempt * 15;
          process.stdout.write(`\n  [DB error (${e.code ?? e.message?.slice(0,30)}) — retry ${attempt}/5 in ${wait}s…]`);
          await new Promise(r => setTimeout(r, wait * 1000));
          await prod.$disconnect().catch(() => {});
          await prod.$connect().catch(() => {});
        } else throw e;
      }
    }
    updated += batch.length;
    process.stdout.write(`\r  Updated ${updated.toLocaleString()}/${updates.length.toLocaleString()}…`);
  }
  process.stdout.write("\n");

  const finalCount = await prod.peak.count({ where: { OR: [{ comarca: { not: null } }, { mountainRange: { not: null } }] } });
  console.log(`\n✅ Done — ${updated.toLocaleString()} peaks updated in prod`);
  console.log(`   Prod peaks with enrichment data: ${finalCount.toLocaleString()}`);
}

main()
  .catch(err => { console.error("\nError:", err); process.exit(1); })
  .finally(() => Promise.all([staging.$disconnect(), prod.$disconnect()]));
