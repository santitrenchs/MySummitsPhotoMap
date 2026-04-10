import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { uploadToR2, deleteFromR2, photoStorageKey } from "@/lib/storage/r2";
import { randomUUID } from "crypto";

export async function listPhotos(tenantId: string, ascentId: string) {
  const db = await getTenantConnection(tenantId);
  return db.photo.findMany({
    where: { tenantId, ascentId },
    orderBy: { createdAt: "asc" },
  });
}

export async function uploadPhoto({
  tenantId,
  ascentId,
  buffer,
  contentType,
}: {
  tenantId: string;
  ascentId: string;
  buffer: Buffer;
  contentType: string;
}) {
  const photoId = randomUUID();
  const key = photoStorageKey(tenantId, photoId);
  const url = await uploadToR2({ key, body: buffer, contentType });

  const db = await getTenantConnection(tenantId);
  return db.photo.create({
    data: { tenantId, ascentId, storageKey: key, url },
  });
}

export async function deletePhoto(tenantId: string, photoId: string) {
  const db = await getTenantConnection(tenantId);
  const photo = await db.photo.findFirst({
    where: { id: photoId, tenantId },
  });
  if (!photo) return null;

  await deleteFromR2(photo.storageKey);
  return db.photo.delete({ where: { id: photoId } });
}
