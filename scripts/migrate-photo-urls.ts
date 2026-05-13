/**
 * Migrates all R2 photo/avatar URLs from the old pub-xxx.r2.dev domain
 * to the new custom domain (media.peakadex.com).
 *
 * Run with:
 *   DATABASE_URL="<prod_url>" npx ts-node --project tsconfig.json -e "require('./scripts/migrate-photo-urls.ts')"
 * Or:
 *   DATABASE_URL="<prod_url>" npx tsx scripts/migrate-photo-urls.ts
 */

import { PrismaClient } from "@prisma/client";

const OLD = "https://pub-e648f9ddf0d74df1b67853b9453fbca5.r2.dev";
const NEW = "https://media.peakadex.com";

async function main() {
  const db = new PrismaClient();

  // Count before
  const photoCount = await db.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM photos WHERE url LIKE ${OLD + "%"}
  `;
  const avatarCount = await db.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM users WHERE "avatarUrl" LIKE ${OLD + "%"}
  `;

  console.log(`Photos to update: ${photoCount[0].count}`);
  console.log(`Avatars to update: ${avatarCount[0].count}`);

  // Update photos.url
  const photosUpdated = await db.$executeRaw`
    UPDATE photos
    SET url = REPLACE(url, ${OLD}, ${NEW})
    WHERE url LIKE ${OLD + "%"}
  `;
  console.log(`Updated ${photosUpdated} photo URLs`);

  // Update users.avatarUrl
  const avatarsUpdated = await db.$executeRaw`
    UPDATE users
    SET "avatarUrl" = REPLACE("avatarUrl", ${OLD}, ${NEW})
    WHERE "avatarUrl" LIKE ${OLD + "%"}
  `;
  console.log(`Updated ${avatarsUpdated} avatar URLs`);

  await db.$disconnect();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
