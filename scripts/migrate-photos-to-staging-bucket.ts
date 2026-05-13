/**
 * Copies all photos (and originals) from the production R2 bucket to the staging bucket,
 * then updates Photo.url in the staging DB to point to the new public URL.
 *
 * Required env vars (set in .env.local or export before running):
 *   DATABASE_URL            — staging DB connection string
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_SOURCE_BUCKET        — source bucket name (e.g. "mysummits")
 *   R2_DEST_BUCKET          — destination bucket name (e.g. "peakadex-staging")
 *   R2_SOURCE_PUBLIC_URL    — e.g. https://pub-e648f9ddf0d74df1b67853b9453fbca5.r2.dev
 *   R2_DEST_PUBLIC_URL      — e.g. https://pub-0f494365492b4a6da301b485441d90e7.r2.dev
 *
 * Run:
 *   npx tsx scripts/migrate-photos-to-staging-bucket.ts
 */

import { S3Client, CopyObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const accountId   = process.env.R2_ACCOUNT_ID!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretKey   = process.env.R2_SECRET_ACCESS_KEY!;
const srcBucket   = process.env.R2_SOURCE_BUCKET!;
const dstBucket   = process.env.R2_DEST_BUCKET!;
const srcPublicUrl = process.env.R2_SOURCE_PUBLIC_URL!;
const dstPublicUrl = process.env.R2_DEST_PUBLIC_URL!;

for (const v of ["R2_ACCOUNT_ID","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","R2_SOURCE_BUCKET","R2_DEST_BUCKET","R2_SOURCE_PUBLIC_URL","R2_DEST_PUBLIC_URL"]) {
  if (!process.env[v]) { console.error(`Missing env var: ${v}`); process.exit(1); }
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey: secretKey },
});

async function keyExists(bucket: string, key: string): Promise<boolean> {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function copyKey(key: string): Promise<"copied" | "skipped" | "missing"> {
  const exists = await keyExists(srcBucket, key);
  if (!exists) return "missing";
  await r2.send(new CopyObjectCommand({
    Bucket: dstBucket,
    CopySource: `${srcBucket}/${key}`,
    Key: key,
  }));
  return "copied";
}

async function main() {
  const photos = await prisma.photo.findMany({
    select: { id: true, storageKey: true, originalStorageKey: true, url: true },
  });

  console.log(`Found ${photos.length} photos in staging DB`);

  let copied = 0, skipped = 0, missing = 0, urlsUpdated = 0;

  for (const photo of photos) {
    // Copy display photo
    const result = await copyKey(photo.storageKey);
    if (result === "copied") copied++;
    else if (result === "skipped") skipped++;
    else { missing++; console.warn(`  MISSING: ${photo.storageKey}`); }

    // Copy original if present
    if (photo.originalStorageKey) {
      const origResult = await copyKey(photo.originalStorageKey);
      if (origResult === "copied") copied++;
      else if (origResult === "skipped") skipped++;
      else { missing++; console.warn(`  MISSING original: ${photo.originalStorageKey}`); }
    }

    // Update Photo.url to point to the new bucket
    if (photo.url.startsWith(srcPublicUrl)) {
      const newUrl = photo.url.replace(srcPublicUrl, dstPublicUrl);
      await prisma.photo.update({ where: { id: photo.id }, data: { url: newUrl } });
      urlsUpdated++;
    }

    process.stdout.write(`\r  Progress: ${photos.indexOf(photo) + 1}/${photos.length}`);
  }

  // Also update avatar URLs in User table
  const users = await prisma.user.findMany({
    where: { avatarUrl: { startsWith: srcPublicUrl } },
    select: { id: true, avatarUrl: true },
  });
  for (const user of users) {
    const newUrl = user.avatarUrl!.replace(srcPublicUrl, dstPublicUrl);
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: newUrl } });
    urlsUpdated++;
  }

  console.log(`\n\nDone!`);
  console.log(`  Copied:        ${copied}`);
  console.log(`  Already exist: ${skipped}`);
  console.log(`  Missing:       ${missing}`);
  console.log(`  URLs updated:  ${urlsUpdated}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
