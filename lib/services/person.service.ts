import { getTenantConnection } from "@/lib/db/tenant-resolver";

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
