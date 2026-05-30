/**
 * backfill-user-stats.ts
 *
 * One-time script to populate user_stats for all existing users.
 * Safe to re-run — upserts, so already-computed rows are refreshed.
 *
 *   DATABASE_URL="..." npx tsx scripts/backfill-user-stats.ts
 *   DATABASE_URL="..." npx tsx scripts/backfill-user-stats.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

function computeLevelIdx(uniquePeaks: number, uniqueAlts: number[]): number {
  const u2000 = uniqueAlts.filter((m) => m >= 2000).length;
  const u3000 = uniqueAlts.filter((m) => m >= 3000).length;
  const u4000 = uniqueAlts.filter((m) => m >= 4000).length;
  const u5000 = uniqueAlts.filter((m) => m >= 5000).length;
  const u6500 = uniqueAlts.filter((m) => m >= 6500).length;
  const u8000 = uniqueAlts.filter((m) => m >= 8000).length;

  if (uniquePeaks >= 300 && u8000 >= 1) return 6;
  if (uniquePeaks >= 220 && u6500 >= 1) return 5;
  if (uniquePeaks >= 150 && u5000 >= 1) return 4;
  if (uniquePeaks >= 100 && u4000 >= 1) return 3;
  if (uniquePeaks >= 50  && u3000 >= 1) return 2;
  if (uniquePeaks >= 20  && u2000 >= 1) return 1;
  return 0;
}

async function backfillUser(userId: string): Promise<void> {
  const ascents = await prisma.ascent.findMany({
    where: { createdBy: userId },
    select: {
      peakId: true,
      peak: {
        select: {
          altitudeM: true,
          isMythic: true,
          rarity: { select: { ep: true } },
        },
      },
    },
  });

  const seenPeaks = new Map<string, number>();
  let totalEp = 0;
  let totalCairns = 0;

  for (const a of ascents) {
    if (!seenPeaks.has(a.peakId)) seenPeaks.set(a.peakId, a.peak.altitudeM);
    totalEp += a.peak.rarity?.ep ?? 1;
    if (a.peak.isMythic) totalCairns++;
  }

  const uniqueAlts   = [...seenPeaks.values()];
  const totalAscents = ascents.length;
  const uniquePeaks  = seenPeaks.size;
  const maxAltitudeM = uniqueAlts.length > 0 ? Math.max(...uniqueAlts) : 0;
  const levelIdx     = computeLevelIdx(uniquePeaks, uniqueAlts);

  if (dryRun) {
    console.log(`  userId=${userId} ascents=${totalAscents} uniquePeaks=${uniquePeaks} maxAlt=${maxAltitudeM} ep=${totalEp} cairns=${totalCairns} level=${levelIdx}`);
    return;
  }

  await prisma.userStats.upsert({
    where:  { userId },
    create: { userId, totalAscents, uniquePeaks, maxAltitudeM, totalEp, totalCairns, levelIdx },
    update: {         totalAscents, uniquePeaks, maxAltitudeM, totalEp, totalCairns, levelIdx },
  });
}

async function main() {
  console.log(`backfill-user-stats — ${dryRun ? "DRY RUN" : "APPLYING"}`);

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  console.log(`Found ${users.length} users\n`);

  let ok = 0;
  let err = 0;
  for (const u of users) {
    try {
      process.stdout.write(`[${ok + err + 1}/${users.length}] ${u.name ?? u.id} ... `);
      await backfillUser(u.id);
      console.log(dryRun ? "" : "ok");
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
