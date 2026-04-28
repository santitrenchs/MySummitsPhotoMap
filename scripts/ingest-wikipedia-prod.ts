/**
 * Ingest Wikipedia texts for peaks that have no entry in peak_wiki_descriptions.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/ingest-wikipedia-prod.ts
 *
 * Options (env vars):
 *   LANGS=en,es,ca      only process these languages (default: all 5)
 *   DRY_RUN=1           print what would be done without writing to DB
 *   DELAY_MS=500        pause between peaks in ms (default: 500, be polite to Wikipedia)
 */

import { PrismaClient } from "@prisma/client";
import { fetchWikiTextsForPeak } from "../lib/services/wiki.service";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "500");

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // Peaks that have at least one wiki entry already
  const coveredPeakIds = await prisma.peakWikiText
    .findMany({ select: { peakId: true }, distinct: ["peakId"] })
    .then((rows) => new Set(rows.map((r) => r.peakId)));

  const allPeaks = await prisma.peak.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const pending = allPeaks.filter((p) => !coveredPeakIds.has(p.id));

  console.log(`Peaks total:   ${allPeaks.length}`);
  console.log(`Already done:  ${coveredPeakIds.size}`);
  console.log(`To process:    ${pending.length}`);
  if (DRY_RUN) console.log("DRY RUN — no writes will happen\n");
  console.log("");

  let ok = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < pending.length; i++) {
    const peak = pending[i];
    const prefix = `[${String(i + 1).padStart(4)}/${pending.length}] ${peak.name}`;
    process.stdout.write(`${prefix} ... `);

    try {
      const results = await fetchWikiTextsForPeak(peak.name);

      if (results.length === 0) {
        console.log("no results");
        notFound++;
      } else {
        if (!DRY_RUN) {
          await Promise.all(
            results.map((r) =>
              prisma.peakWikiText.upsert({
                where: { peakId_lang: { peakId: peak.id, lang: r.lang } },
                create: {
                  peakId: peak.id,
                  lang: r.lang,
                  title: r.title,
                  body: r.body,
                  wikiUrl: r.wikiUrl,
                  confidence: r.confidence,
                  status: "auto",
                  fetchedAt: new Date(),
                },
                update: {
                  title: r.title,
                  body: r.body,
                  wikiUrl: r.wikiUrl,
                  confidence: r.confidence,
                  status: "auto",
                  fetchedAt: new Date(),
                },
              })
            )
          );
        }
        const langs = results.map((r) => r.lang).join(", ");
        console.log(`✓ ${results.length} langs (${langs})`);
        ok++;
      }
    } catch (err) {
      console.log(`ERROR: ${err}`);
      errors++;
    }

    if (i < pending.length - 1) await sleep(DELAY_MS);
  }

  console.log("\n─────────────────────────────");
  console.log(`Done.  ✓ ${ok}  not found: ${notFound}  errors: ${errors}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
