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
      user: { select: { id: true } },
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

export async function listPersons(
  tenantId: string,
  search?: string,
  options?: { currentUserId?: string },
) {
  if (!search) return [];
  const db = await getTenantConnection(tenantId);

  // Fetch friend user IDs for priority sorting
  let friendUserIds = new Set<string>();
  if (options?.currentUserId) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: options.currentUserId, status: "ACCEPTED" },
          { addresseeId: options.currentUserId, status: "ACCEPTED" },
        ],
      },
      select: { requesterId: true, addresseeId: true },
    });
    friendUserIds = new Set(
      friendships.map((f) =>
        f.requesterId === options.currentUserId ? f.addresseeId : f.requesterId,
      ),
    );
  }

  // Only return persons linked to the current user or their friends
  const allowedUserIds = [
    ...(options?.currentUserId ? [options.currentUserId] : []),
    ...Array.from(friendUserIds),
  ];

  const rows = await db.person.findMany({
    where: {
      tenantId,
      name: { contains: search, mode: "insensitive" },
      userId: { in: allowedUserIds },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, userId: true },
    take: 10,
  });

  // Priority: current user (0) → friends (1)
  const priority = (p: { userId?: string | null }) => {
    if (p.userId === options?.currentUserId) return 0;
    return 1;
  };

  return rows.sort((a, b) => priority(a) - priority(b)).slice(0, 5);
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

// ─── Cross-tenant claim (used from Settings — person may be in any tenant) ───

/** Search persons by name across ALL tenants (for the linked-profile settings flow). */
export async function searchPersonsGlobal(query: string) {
  return prisma.person.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
      userId: null, // only show unclaimed persons
    },
    select: { id: true, name: true, tenantId: true },
    take: 10,
    orderBy: { name: "asc" },
  });
}

/** Claim a person from any tenant (cross-tenant safe). */
export async function claimPersonProfileGlobal(personId: string, userId: string) {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) throw new Error("Person not found");
  if (person.userId && person.userId !== userId) throw new Error("Already claimed by another user");
  // userId is @unique — one link per user globally
  const existing = await prisma.person.findFirst({ where: { userId } });
  if (existing && existing.id !== personId) throw new Error("You already have a linked profile");
  return prisma.person.update({ where: { id: personId }, data: { userId } });
}

/** Unclaim a person from any tenant (cross-tenant safe). */
export async function unclaimPersonProfileGlobal(personId: string, userId: string) {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) throw new Error("Person not found");
  if (person.userId !== userId) throw new Error("Forbidden");
  return prisma.person.update({ where: { id: personId }, data: { userId: null } });
}

// ─── Reconcile tag → registered user ─────────────────────────────────────────

/**
 * Associates a Person tag with a registered user.
 *
 * Case A — no canonical Person exists for (tenantId, targetUserId):
 *   Sets person.userId = targetUserId and person.name = displayName.
 *
 * Case B — a canonical Person already exists for (tenantId, targetUserId):
 *   Reassigns all FaceTags from the old Person to the canonical one,
 *   handling @@unique([faceDetectionId, personId]) conflicts by deleting
 *   duplicates. Then deletes the old Person.
 *
 * Returns the canonical Person after reconciliation.
 */
export async function reconcilePersonToUser(
  tenantId: string,
  personId: string,
  targetUserId: string,
  displayName: string,
) {
  // Validate person belongs to tenant
  const person = await prisma.person.findFirst({ where: { id: personId, tenantId } });
  if (!person) throw new Error("Person not found");
  if (person.userId) throw new Error("Already reconciled");

  // Check if a canonical Person already exists for this user in this tenant
  const canonical = await prisma.person.findFirst({ where: { tenantId, userId: targetUserId } });

  if (!canonical) {
    // Case A: this person becomes the canonical one
    return prisma.person.update({
      where: { id: personId },
      data: { userId: targetUserId, name: displayName },
      select: { id: true, name: true, userId: true },
    });
  }

  // Case B: merge old person's FaceTags into the canonical person
  const oldTags = await prisma.faceTag.findMany({ where: { personId, tenantId } });

  // Find which faceDetectionIds the canonical already has tagged
  const canonicalDetectionIds = new Set(
    (await prisma.faceTag.findMany({
      where: { personId: canonical.id, tenantId },
      select: { faceDetectionId: true },
    })).map((t) => t.faceDetectionId),
  );

  await prisma.$transaction([
    // Delete old tags that would conflict with canonical's existing tags
    prisma.faceTag.deleteMany({
      where: {
        personId,
        tenantId,
        faceDetectionId: { in: oldTags.filter((t) => canonicalDetectionIds.has(t.faceDetectionId)).map((t) => t.faceDetectionId) },
      },
    }),
    // Reassign remaining tags to canonical
    prisma.faceTag.updateMany({
      where: {
        personId,
        tenantId,
        faceDetectionId: { notIn: [...canonicalDetectionIds] },
      },
      data: { personId: canonical.id },
    }),
    // Delete the now-empty old Person
    prisma.person.delete({ where: { id: personId } }),
  ]);

  return prisma.person.findUnique({
    where: { id: canonical.id },
    select: { id: true, name: true, userId: true },
  });
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
