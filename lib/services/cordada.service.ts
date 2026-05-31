import { prisma } from "@/lib/db/client";

// ── Types ──────────────────────────────────────────────────────────────────────

export type CordadaSummary = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  memberCount: number;
  memberAvatars: (string | null)[];
  myRole: "OWNER" | "MEMBER";
};

export type CordadaInvite = {
  cordadaId: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  ownerName: string;
  createdAt: string;
};

export type CordadaMemberRanking = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  levelIdx: number;
  uniquePeaks: number;
  totalEp: number;
  totalCairns: number;
  isOwner: boolean;
  isCurrentUser: boolean;
  isPending: boolean;
};

export type CordadaDetail = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  isOwner: boolean;
  members: CordadaMemberRanking[];
};

// ── Queries ────────────────────────────────────────────────────────────────────

export async function listMyCordadas(userId: string): Promise<CordadaSummary[]> {
  const memberships = await prisma.cordadaMember.findMany({
    where:   { userId, status: "ACCEPTED" },
    include: {
      cordada: {
        include: {
          members: {
            where:   { status: "ACCEPTED" },
            include: { user: { select: { avatarUrl: true } } },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id:            m.cordada.id,
    name:          m.cordada.name,
    description:   m.cordada.description,
    avatarUrl:     m.cordada.avatarUrl ?? null,
    ownerId:       m.cordada.ownerId,
    memberCount:   m.cordada.members.length,
    memberAvatars: m.cordada.members.slice(0, 4).map((mem) => mem.user.avatarUrl ?? null),
    myRole:        m.cordada.ownerId === userId ? "OWNER" : "MEMBER",
  }));
}

export async function listPendingInvites(userId: string): Promise<CordadaInvite[]> {
  const pending = await prisma.cordadaMember.findMany({
    where:   { userId, status: "PENDING" },
    include: {
      cordada: { include: { owner: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return pending.map((m) => ({
    cordadaId:   m.cordadaId,
    name:        m.cordada.name,
    description: m.cordada.description,
    avatarUrl:   m.cordada.avatarUrl ?? null,
    ownerName:   m.cordada.owner.name ?? "",
    createdAt:   m.createdAt.toISOString(),
  }));
}

export async function createCordada(
  ownerId: string,
  name: string,
  description?: string,
  memberIds?: string[],
) {
  // Validate that every invited member is an ACCEPTED friend of the owner.
  let validMemberIds: string[] = [];
  if (memberIds && memberIds.length > 0) {
    const unique = [...new Set(memberIds)].filter((id) => id !== ownerId);
    if (unique.length > 0) {
      const friendships = await prisma.friendship.findMany({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: ownerId, addresseeId: { in: unique } },
            { requesterId: { in: unique }, addresseeId: ownerId },
          ],
        },
        select: { requesterId: true, addresseeId: true },
      });
      const friendSet = new Set(
        friendships.map((f) => (f.requesterId === ownerId ? f.addresseeId : f.requesterId)),
      );
      validMemberIds = unique.filter((id) => friendSet.has(id));
    }
  }

  return prisma.cordada.create({
    data: {
      name,
      description: description ?? null,
      ownerId,
      members: {
        create: [
          {
            userId:   ownerId,
            role:     "OWNER",
            status:   "ACCEPTED",
            joinedAt: new Date(),
          },
          ...validMemberIds.map((userId) => ({
            userId,
            role:        "MEMBER" as const,
            status:      "PENDING" as const,
            invitedById: ownerId,
          })),
        ],
      },
    },
  });
}

export async function getCordadaDetail(cordadaId: string, currentUserId: string): Promise<CordadaDetail | null> {
  // First resolve the owner so we know whether to expose PENDING invitees.
  const ownerRow = await prisma.cordada.findUnique({
    where:  { id: cordadaId },
    select: { ownerId: true },
  });
  if (!ownerRow) return null;
  const isOwner = ownerRow.ownerId === currentUserId;

  const cordada = await prisma.cordada.findUnique({
    where:   { id: cordadaId },
    include: {
      members: {
        // Only the owner sees pending (not-yet-accepted) invitees.
        where:   isOwner ? { status: { in: ["ACCEPTED", "PENDING"] } } : { status: "ACCEPTED" },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      },
    },
  });
  if (!cordada) return null;

  const userIds    = cordada.members.map((m) => m.userId);
  const statsRows  = await prisma.userStats.findMany({
    where:  { userId: { in: userIds } },
    select: { userId: true, uniquePeaks: true, totalEp: true, totalCairns: true, levelIdx: true },
  });
  const statsMap = new Map(statsRows.map((s) => [s.userId, s]));

  const members: CordadaMemberRanking[] = cordada.members
    .map((m) => {
      const s = statsMap.get(m.userId);
      return {
        userId:        m.userId,
        name:          m.user.name ?? "?",
        avatarUrl:     m.user.avatarUrl ?? null,
        levelIdx:      s?.levelIdx   ?? 1,
        uniquePeaks:   s?.uniquePeaks ?? 0,
        totalEp:       s?.totalEp    ?? 0,
        totalCairns:   s?.totalCairns ?? 0,
        isOwner:       m.userId === cordada.ownerId,
        isCurrentUser: m.userId === currentUserId,
        isPending:     m.status === "PENDING",
      };
    })
    // Accepted members first (ranked by peaks/EP); pending invitees last.
    .sort((a, b) =>
      Number(a.isPending) - Number(b.isPending) ||
      b.uniquePeaks - a.uniquePeaks ||
      b.totalEp     - a.totalEp
    );

  return {
    id:          cordada.id,
    name:        cordada.name,
    description: cordada.description,
    avatarUrl:   cordada.avatarUrl ?? null,
    ownerId:     cordada.ownerId,
    isOwner,
    members,
  };
}

export async function inviteToCordada(cordadaId: string, ownerId: string, targetUserId: string) {
  const cordada = await prisma.cordada.findUnique({ where: { id: cordadaId } });
  if (!cordada)                      throw new Error("Cordada not found");
  if (cordada.ownerId !== ownerId)   throw new Error("Only the owner can invite");
  if (targetUserId === ownerId)      throw new Error("Cannot invite yourself");

  const existing = await prisma.cordadaMember.findUnique({
    where: { cordadaId_userId: { cordadaId, userId: targetUserId } },
  });
  if (existing) throw new Error("User is already a member or has a pending invite");

  return prisma.cordadaMember.create({
    data: {
      cordadaId,
      userId:      targetUserId,
      role:        "MEMBER",
      status:      "PENDING",
      invitedById: ownerId,
    },
  });
}

export async function respondToCordadaInvite(
  cordadaId: string,
  userId: string,
  action: "ACCEPTED" | "REJECTED",
) {
  const membership = await prisma.cordadaMember.findUnique({
    where: { cordadaId_userId: { cordadaId, userId } },
  });
  if (!membership || membership.status !== "PENDING") throw new Error("No pending invite found");

  if (action === "REJECTED") {
    await prisma.cordadaMember.delete({
      where: { cordadaId_userId: { cordadaId, userId } },
    });
    return { ok: true };
  }

  return prisma.cordadaMember.update({
    where: { cordadaId_userId: { cordadaId, userId } },
    data:  { status: "ACCEPTED", joinedAt: new Date() },
  });
}

export async function removeMember(cordadaId: string, requesterId: string, targetUserId: string) {
  const cordada = await prisma.cordada.findUnique({ where: { id: cordadaId } });
  if (!cordada) throw new Error("Cordada not found");

  const isSelf  = requesterId === targetUserId;
  const isOwner = cordada.ownerId === requesterId;

  if (!isSelf && !isOwner) throw new Error("Not authorized");
  if (isOwner && isSelf)   throw new Error("Owner cannot leave — delete the cordada instead");

  await prisma.cordadaMember.delete({
    where: { cordadaId_userId: { cordadaId, userId: targetUserId } },
  });
  return { ok: true };
}

export async function deleteCordada(cordadaId: string, ownerId: string) {
  const cordada = await prisma.cordada.findUnique({ where: { id: cordadaId } });
  if (!cordada)                    throw new Error("Cordada not found");
  if (cordada.ownerId !== ownerId) throw new Error("Only the owner can delete");

  await prisma.cordada.delete({ where: { id: cordadaId } });
  return { ok: true };
}
