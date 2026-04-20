import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { uploadToR2, deleteFromR2, photoStorageKey, photoOriginalStorageKey } from "@/lib/storage/r2";
import { randomUUID } from "crypto";

export async function listPhotos(tenantId: string, ascentId: string) {
  const db = await getTenantConnection(tenantId);
  return db.photo.findMany({
    where: { tenantId, ascentId },
    orderBy: { createdAt: "asc" },
  });
}

export type CropMeta = {
  x: number;
  y: number;
  w: number;
  h: number;
  aspect: string;
  rotation: 0 | 90 | 180 | 270;
};

export async function uploadPhoto({
  tenantId,
  ascentId,
  buffer,
  contentType,
  originalBuffer,
  cropMeta,
  reuseOriginalStorageKey,
}: {
  tenantId: string;
  ascentId: string;
  buffer: Buffer;
  contentType: string;
  originalBuffer?: Buffer;
  cropMeta?: CropMeta;
  reuseOriginalStorageKey?: string;
}) {
  const photoId = randomUUID();
  const key = photoStorageKey(tenantId, photoId);
  const url = await uploadToR2({ key, body: buffer, contentType });

  let resolvedOriginalKey: string | undefined;
  if (reuseOriginalStorageKey) {
    // Re-crop: reuse the existing original in R2, no new upload needed
    resolvedOriginalKey = reuseOriginalStorageKey;
  } else if (originalBuffer) {
    resolvedOriginalKey = photoOriginalStorageKey(tenantId, photoId);
    await uploadToR2({ key: resolvedOriginalKey, body: originalBuffer, contentType: "image/jpeg" });
  }

  const db = await getTenantConnection(tenantId);
  return db.photo.create({
    data: {
      tenantId,
      ascentId,
      storageKey: key,
      url,
      ...(resolvedOriginalKey && cropMeta ? {
        originalStorageKey: resolvedOriginalKey,
        cropX: cropMeta.x,
        cropY: cropMeta.y,
        cropW: cropMeta.w,
        cropH: cropMeta.h,
        cropAspect: cropMeta.aspect,
        cropRotation: cropMeta.rotation,
      } : {}),
    },
  });
}

export async function deletePhoto(tenantId: string, photoId: string, keepOriginal = false) {
  const db = await getTenantConnection(tenantId);
  const photo = await db.photo.findFirst({
    where: { id: photoId, tenantId },
  });
  if (!photo) return null;

  await deleteFromR2(photo.storageKey);
  if (photo.originalStorageKey && !keepOriginal) {
    await deleteFromR2(photo.originalStorageKey);
  }
  return db.photo.delete({ where: { id: photoId } });
}
