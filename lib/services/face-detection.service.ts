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
  // Return created records in insertion order (same order as input `faces`)
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

export async function getKnownDescriptors(tenantId: string) {
  const db = await getTenantConnection(tenantId);
  // Only use ACCEPTED tags for face recognition model
  const tags = await db.faceTag.findMany({
    where: { tenantId, status: "ACCEPTED" },
    include: {
      person: { select: { id: true, name: true } },
      faceDetection: { select: { descriptor: true } },
    },
  });
  // Group descriptors by person
  const byPerson = new Map<string, { name: string; descriptors: number[][] }>();
  for (const tag of tags) {
    const desc = tag.faceDetection.descriptor as number[] | null;
    if (!desc) continue;
    if (!byPerson.has(tag.person.id)) {
      byPerson.set(tag.person.id, { name: tag.person.name, descriptors: [] });
    }
    byPerson.get(tag.person.id)!.descriptors.push(desc);
  }
  return Array.from(byPerson.values());
}

export async function getFaceDetections(tenantId: string, photoId: string) {
  const db = await getTenantConnection(tenantId);
  return db.faceDetection.findMany({
    where: { tenantId, photoId },
    include: {
      faceTags: { include: { person: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function setFaceTag(
  tenantId: string,
  faceDetectionId: string,
  personId: string
) {
  const db = await getTenantConnection(tenantId);
  // Remove any existing tag on this detection first (one person per box)
  await db.faceTag.deleteMany({ where: { tenantId, faceDetectionId } });
  if (!personId) return null;

  // Check if tagged person has review preferences via their linked User
  let status: "ACCEPTED" | "PENDING" = "ACCEPTED";
  const person = await db.person.findFirst({
    where: { id: personId, tenantId },
    select: { userId: true },
  });
  if (person?.userId) {
    const linkedUser = await prisma.user.findUnique({
      where: { id: person.userId },
      select: { reviewTagsBeforePost: true, allowOthersToTag: true },
    });
    if (linkedUser && !linkedUser.allowOthersToTag) return null;
    if (linkedUser?.reviewTagsBeforePost) status = "PENDING";
  }

  return db.faceTag.create({
    data: { tenantId, faceDetectionId, personId, status },
    include: { person: { select: { id: true, name: true } } },
  });
}

export async function removeFaceTag(tenantId: string, faceDetectionId: string) {
  const db = await getTenantConnection(tenantId);
  return db.faceTag.deleteMany({ where: { tenantId, faceDetectionId } });
}

// ─── Pending tag approval (cross-tenant, uses global prisma) ──────────────────

export async function listPendingTagsForUser(userId: string) {
  return prisma.faceTag.findMany({
    where: {
      status: "PENDING",
      person: { userId },
    },
    include: {
      person: { select: { id: true, name: true } },
      faceDetection: {
        include: {
          photo: {
            include: {
              ascent: {
                include: {
                  peak: { select: { name: true, altitudeM: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function countPendingTagsForUser(userId: string): Promise<number> {
  return prisma.faceTag.count({
    where: { status: "PENDING", person: { userId } },
  });
}

export async function respondToFaceTag(
  tagId: string,
  userId: string,
  action: "ACCEPTED" | "REJECTED"
) {
  // Verify the tag belongs to a person linked to this user
  const tag = await prisma.faceTag.findUnique({
    where: { id: tagId },
    include: { person: { select: { userId: true } } },
  });
  if (!tag) throw new Error("Not found");
  if (tag.person.userId !== userId) throw new Error("Forbidden");
  if (tag.status !== "PENDING") throw new Error("Tag is not pending");

  if (action === "REJECTED") {
    return prisma.faceTag.delete({ where: { id: tagId } });
  }
  return prisma.faceTag.update({ where: { id: tagId }, data: { status: "ACCEPTED" } });
}
