/**
 * backfill-user-stats.ts
 *
 * One-time script to populate user_stats for all existing users.
 * Safe to re-run — upserts, so already-computed rows are refreshed.
 *
 *   DATABASE_URL="..." npx tsx scripts/backfill-user-stats.ts
 *   DATABASE_URL="..." npx tsx scripts/backfill-user-stats.ts --dry-run
 *
 * Uses recomputeUserStats() from stats.service.ts as the single source of
 * truth — no level thresholds are duplicated here.
 */

import { PrismaClient } from "@prisma/client";
import { recomputeUserStats } from "../lib/services/stats.service";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(`backfill-user-stats — ${dryRun ? "DRY RUN" : "APPLYING"}`);

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  console.log(`Found ${users.length} users\n`);

  let ok = 0;
  let err = 0;
  for (const u of users) {
    try {
      process.stdout.write(`[${ok + err + 1}/${users.length}] ${u.name ?? u.id} ... `);
      if (!dryRun) await recomputeUserStats(u.id);
      console.log(dryRun ? "(dry-run)" : "ok");
      ok++;
    } catch (e) {
      console.log(`ERROR: ${(e as Error).message}`);
      err++;
    }
  }

  console.log(`\nDone. ${ok} ok, ${err} errors.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
