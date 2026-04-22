/**
 * One-time migration: FaceTag.personId → FaceTag.userId
 *
 * - Tags where Person.userId IS NOT NULL → copy userId to FaceTag.userId, clear personId
 * - Tags where Person.userId IS NULL     → delete (unreconciled, no user to point to)
 * - Duplicate (faceDetectionId, userId)  → keep first, delete the rest
 *
 * Run against sandbox:
 *   DATABASE_URL="postgresql://..." npx ts-node --project tsconfig.json scripts/migrate-facetags.ts
 */

import { PrismaClient } from "@prisma/client";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL not set");

const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

async function main() {
  // Fetch all face tags with their linked person's userId
  const tags = await prisma.faceTag.findMany({
    where: { personId: { not: null } },
    include: { person: { select: { userId: true } } },
  });

  console.log(`Total face tags with personId: ${tags.length}`);

  const toDelete: string[] = [];
  const toUpdate: { id: string; userId: string }[] = [];

  for (const tag of tags) {
    const linkedUserId = tag.person?.userId ?? null;
    if (!linkedUserId) {
      toDelete.push(tag.id);
    } else {
      toUpdate.push({ id: tag.id, userId: linkedUserId });
    }
  }

  console.log(`  → to update (has userId): ${toUpdate.length}`);
  console.log(`  → to delete (no userId):  ${toDelete.length}`);

  // Delete unreconciled tags first
  if (toDelete.length > 0) {
    const deleted = await prisma.faceTag.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`Deleted ${deleted.count} unreconciled tags`);
  }

  // Update tags with userId, handling duplicates
  let updated = 0;
  let skipped = 0;

  for (const { id, userId } of toUpdate) {
    const tag = await prisma.faceTag.findUnique({ where: { id } });
    if (!tag) continue;

    // Check if a tag with this (faceDetectionId, userId) already exists
    const existing = await prisma.faceTag.findFirst({
      where: {
        faceDetectionId: tag.faceDetectionId,
        userId,
        id: { not: id },
      },
    });

    if (existing) {
      // Duplicate — delete this one, keep the existing
      await prisma.faceTag.delete({ where: { id } });
      skipped++;
    } else {
      await prisma.faceTag.update({
        where: { id },
        data: { userId, personId: null },
      });
      updated++;
    }
  }

  console.log(`Updated ${updated} tags with userId`);
  console.log(`Skipped ${skipped} duplicate tags (deleted)`);

  // Verify
  const remaining = await prisma.faceTag.count({ where: { personId: { not: null } } });
  const withUserId = await prisma.faceTag.count({ where: { userId: { not: null } } });
  console.log(`\nFinal state:`);
  console.log(`  Tags with personId still set: ${remaining}`);
  console.log(`  Tags with userId set:         ${withUserId}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
