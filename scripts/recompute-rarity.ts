/**
 * recompute-rarity.ts
 *
 * Syncs the rarityId field in the DB for all peaks based on the current
 * altitude thresholds defined in lib/rarity.ts.
 *
 * Run this whenever you change minAlt values or add/remove tiers in RARITIES:
 *
 *   DATABASE_URL="..." npx tsx scripts/recompute-rarity.ts
 *   DATABASE_URL="..." npx tsx scripts/recompute-rarity.ts --apply
 *
 * Without --apply: dry-run — shows a diff of what would change.
 * With    --apply: writes the changes to the DB.
 */

import { PrismaClient } from "@prisma/client";
import { RARITIES, getRarityId } from "../lib/rarity";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  console.log("\n── Rarity recompute ─────────────────────────────────────────");
  console.log(`Mode: ${apply ? "APPLY (writing to DB)" : "DRY RUN (no writes)"}`);
  console.log("\nTier thresholds from lib/rarity.ts:");
  for (const r of RARITIES) {
    console.log(`  ${r.id.padEnd(12)} ≥ ${String(r.minAlt).padStart(5)} m  →  ${r.color}`);
  }
  console.log("");

  const peaks = await prisma.peak.findMany({
    select: { id: true, name: true, altitudeM: true, rarityId: true },
    orderBy: { altitudeM: "asc" },
  });

  const toUpdate: { id: string; name: string; altitudeM: number; from: string | null; to: string }[] = [];

  for (const peak of peaks) {
    const expected = getRarityId(peak.altitudeM);
    if (peak.rarityId !== expected) {
      toUpdate.push({ id: peak.id, name: peak.name, altitudeM: peak.altitudeM, from: peak.rarityId, to: expected });
    }
  }

  if (toUpdate.length === 0) {
    console.log(`✓ All ${peaks.length} peaks are already in sync. Nothing to do.\n`);
    return;
  }

  console.log(`${toUpdate.length} peak(s) out of sync:\n`);

  // Group by (from → to) for readability
  const groups = new Map<string, typeof toUpdate>();
  for (const p of toUpdate) {
    const key = `${p.from ?? "null"} → ${p.to}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  for (const [transition, items] of groups) {
    console.log(`  ${transition}  (${items.length} peaks)`);
    for (const p of items.slice(0, 5)) {
      console.log(`    · ${p.name} (${p.altitudeM} m)`);
    }
    if (items.length > 5) console.log(`    · … and ${items.length - 5} more`);
    console.log("");
  }

  if (!apply) {
    console.log("→ Run with --apply to write these changes to the DB.\n");
    return;
  }

  console.log("Writing to DB…");
  let updated = 0;
  for (const p of toUpdate) {
    await prisma.peak.update({ where: { id: p.id }, data: { rarityId: p.to } });
    updated++;
    if (updated % 50 === 0) process.stdout.write(`  ${updated}/${toUpdate.length}\r`);
  }

  console.log(`\n✓ Updated ${updated} peaks.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
