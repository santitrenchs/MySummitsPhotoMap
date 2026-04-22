import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getTenantConnection } from "@/lib/db/tenant-resolver";

export type BoundingBox = { x: number; y: number; width: number; height: number };
export type FaceInput = { boundingBox: BoundingBox; descriptor?: number[] };

export async function saveFaceDetections(
  tenantId: string,
  photoId: string,
  faces: FaceInput[]
) {
  const db = await getTenantConnection(tenantId);
  await db.faceDetection.deleteMany({ where: { tenantId, photoId } });
  return db.$transaction(
    faces.map((f) =>
      db.faceDetection.create({
        data: {
          tenantId, photoId,
          boundingBox: f.boundingBox as unknown as Prisma.InputJsonValue,
          ...(f.descriptor !== undefined && {
            descriptor: f.descriptor as unknown as Prisma.InputJsonValue,
          }),
        },
      })
    )
  );
}

export async function getKnownDescriptors(tenantId: string, currentUserId?: string) {
  const db = await getTenantConnection(tenantId);

  // Only suggest self + accepted friends
  let allowedUserIds: string[] | undefined;
  if (currentUserId) {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }],
      },
      select: { requesterId: true, addresseeId: true },
    });
    const friendIds = friendships.map((f) =>
      f.requesterId === currentUserId ? f.addresseeId : f.requesterId
    );
    allowedUserIds = [currentUserId, ...friendIds];
  }

  const tags = await db.faceTag.findMany({
    where: {
      tenantId,
      status: "ACCEPTED",
      userId: { not: null, ...(allowedUserIds ? { in: allowedUserIds } : {}) },
    },
    include: {
      user: { select: { id: true, name: true, username: true } },
      faceDetection: { select: { descriptor: true } },
    },
  });

  // Group descriptors by userId
  const byUser = new Map<string, { userId: string; name: string; descriptors: number[][] }>();
  for (const tag of tags) {
    if (!tag.user) continue;
    const desc = tag.faceDetection.descriptor as number[] | null;
    if (!desc || (desc as unknown[]).length === 0) continue;
    if (!byUser.has(tag.user.id)) {
      byUser.set(tag.user.id, {
        userId: tag.user.id,
        name: tag.user.username ?? tag.user.name,
        descriptors: [],
      });
    }
    byUser.get(tag.user.id)!.descriptors.push(desc);
  }
  return Array.from(byUser.values());
}

export async function getFaceDetections(tenantId: string, photoId: string) {
  const db = await getTenantConnection(tenantId);
  return db.faceDetection.findMany({
    where: { tenantId, photoId },
    include: {
      faceTags: {
        include: { user: { select: { id: true, name: true, username: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function setFaceTag(
  tenantId: string,
  faceDetectionId: string,
  userId: string,
  taggerUserId?: string,
) {
  const db = await getTenantConnection(tenantId);
  // One tag per detection
  await db.faceTag.deleteMany({ where: { tenantId, faceDetectionId } });
  if (!userId) return null;

  // Check allowOthersToTag + friendship
  const taggedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { allowOthersToTag: true },
  });
  if (!taggedUser) return null;

  const isSelf = taggerUserId === userId;
  if (!isSelf) {
    if (!taggedUser.allowOthersToTag) return null;
    if (taggerUserId) {
      const friendship = await prisma.friendship.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: taggerUserId, addresseeId: userId },
            { requesterId: userId, addresseeId: taggerUserId },
          ],
        },
      });
      if (!friendship) return null;
    }
  }

  return db.faceTag.create({
    data: { tenantId, faceDetectionId, userId, status: "ACCEPTED" },
    include: { user: { select: { id: true, name: true, username: true } } },
  });
}

export async function removeFaceTag(tenantId: string, faceDetectionId: string) {
  const db = await getTenantConnection(tenantId);
  return db.faceTag.deleteMany({ where: { tenantId, faceDetectionId } });
}

export async function respondToFaceTag(
  tagId: string,
  userId: string,
  action: "ACCEPTED" | "REJECTED"
) {
  const tag = await prisma.faceTag.findUnique({ where: { id: tagId } });
  if (!tag) throw new Error("Not found");
  if (tag.userId !== userId) throw new Error("Forbidden");
  if (tag.status !== "PENDING") throw new Error("Tag is not pending");

  if (action === "REJECTED") {
    return prisma.faceTag.delete({ where: { id: tagId } });
  }
  return prisma.faceTag.update({ where: { id: tagId }, data: { status: "ACCEPTED" } });
}
