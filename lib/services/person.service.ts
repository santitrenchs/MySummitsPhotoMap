import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { prisma } from "@/lib/db/client";

export async function listPersonsWithStats(tenantId: string, userIdFilter?: string[]) {
  const db = await getTenantConnection(tenantId);
  return db.person.findMany({
    where: {
      tenantId,
      ...(userIdFilter !== undefined
        ? { userId: { in: userIdFilter } }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      faceTags: {
        where: { status: "ACCEPTED" },
        orderBy: { createdAt: "desc" },
        include: {
          faceDetection: {
            include: {
              photo: {
                include: {
                  ascent: {
                    include: { peak: { select: { name: true, altitudeM: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getPersonDetails(tenantId: string, personId: string) {
  const db = await getTenantConnection(tenantId);
  return db.person.findFirst({
    where: { id: personId, tenantId },
    include: {
      user: { select: { id: true, profilePublic: true } },
      faceTags: {
        where: { status: "ACCEPTED" },
        orderBy: { createdAt: "desc" },
        include: {
          faceDetection: {
            include: {
              photo: {
                include: {
                  ascent: {
                    include: {
                      peak: { select: { name: true, altitudeM: true, mountainRange: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function updatePerson(
  tenantId: string,
  personId: string,
  data: { name?: string; email?: string | null }
) {
  const db = await getTenantConnection(tenantId);
  return db.person.updateMany({
    where: { id: personId, tenantId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.email !== undefined && { email: data.email?.trim() || null }),
    },
  });
}

/** @deprecated use updatePerson */
export async function renamePerson(tenantId: string, personId: string, name: string) {
  return updatePerson(tenantId, personId, { name });
}

export async function deletePerson(tenantId: string, personId: string) {
  const db = await getTenantConnection(tenantId);
  return db.person.deleteMany({ where: { id: personId, tenantId } });
}

export async function listPersons(tenantId: string, search?: string) {
  const db = await getTenantConnection(tenantId);
  return db.person.findMany({
    where: {
      tenantId,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: search ? 10 : undefined,
  });
}

export async function findOrCreatePerson(tenantId: string, name: string) {
  const db = await getTenantConnection(tenantId);
  const trimmed = name.trim();
  const existing = await db.person.findFirst({
    where: { tenantId, name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;
  return db.person.create({ data: { tenantId, name: trimmed } });
}

// ─── Claim (link User ↔ Person) ───────────────────────────────────────────────

export async function claimPersonProfile(tenantId: string, personId: string, userId: string) {
  const db = await getTenantConnection(tenantId);
  const person = await db.person.findFirst({ where: { id: personId, tenantId } });
  if (!person) throw new Error("Person not found");
  if (person.userId && person.userId !== userId) throw new Error("Already claimed by another user");

  // Ensure user doesn't already have a linked person in this tenant
  const existing = await db.person.findFirst({ where: { tenantId, userId } });
  if (existing && existing.id !== personId) throw new Error("You already have a linked profile");

  return db.person.update({ where: { id: personId }, data: { userId } });
}

export async function unclaimPersonProfile(tenantId: string, personId: string, userId: string) {
  const db = await getTenantConnection(tenantId);
  const person = await db.person.findFirst({ where: { id: personId, tenantId } });
  if (!person) throw new Error("Person not found");
  if (person.userId !== userId) throw new Error("Forbidden");
  return db.person.update({ where: { id: personId }, data: { userId: null } });
}

export async function getLinkedPerson(tenantId: string, userId: string) {
  const db = await getTenantConnection(tenantId);
  return db.person.findFirst({
    where: { tenantId, userId },
    select: { id: true, name: true },
  });
}

// ─── Global lookup (for settings page showing linked person across tenants) ───

export async function getLinkedPersonGlobal(userId: string) {
  return prisma.person.findFirst({
    where: { userId },
    select: { id: true, name: true, tenantId: true },
  });
}
