import { getTenantConnection } from "@/lib/db/tenant-resolver";

export async function listPersonsWithStats(tenantId: string) {
  const db = await getTenantConnection(tenantId);
  return db.person.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: {
      faceTags: {
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
      faceTags: {
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

export async function listPersons(tenantId: string) {
  const db = await getTenantConnection(tenantId);
  return db.person.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
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
