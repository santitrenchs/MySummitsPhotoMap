import { prisma } from "@/lib/db/client";

export type FriendEntry = {
  id: string;
  friend: {
    id: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
    levelIdx: number;
    uniquePeaks: number;
    totalEp: number;
    totalCairns: number;
  };
  isRequester: boolean;
  createdAt: Date;
};

export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  if (requesterId === addresseeId) throw new Error("Cannot friend yourself");

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") throw new Error("Already friends");
    if (existing.status === "PENDING") throw new Error("Request already pending");
    if (existing.status === "BLOCKED") throw new Error("Cannot send request");
    // REJECTED by this same requester → allow retry
    if (existing.status === "REJECTED" && existing.requesterId === requesterId) {
      return prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "PENDING" },
      });
    }
    throw new Error("Cannot send request");
  }

  return prisma.friendship.create({
    data: { requesterId, addresseeId },
  });
}

export async function respondToFriendRequest(
  friendshipId: string,
  addresseeId: string,
  action: "ACCEPTED" | "REJECTED"
) {
  const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!f) throw new Error("Not found");
  if (f.addresseeId !== addresseeId) throw new Error("Forbidden");
  if (f.status !== "PENDING") throw new Error("Request is no longer pending");

  return prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: action },
  });
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new Error("Cannot block yourself");

  // Delete any existing friendship between them (in either direction)
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: blockerId, addresseeId: blockedId },
        { requesterId: blockedId, addresseeId: blockerId },
      ],
    },
  });

  // Create new BLOCKED record with blocker as requester
  return prisma.friendship.create({
    data: { requesterId: blockerId, addresseeId: blockedId, status: "BLOCKED" },
  });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  return prisma.friendship.deleteMany({
    where: { requesterId: blockerId, addresseeId: blockedId, status: "BLOCKED" },
  });
}

export async function removeFriendship(friendshipId: string, userId: string) {
  const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!f) throw new Error("Not found");
  if (f.requesterId !== userId && f.addresseeId !== userId) throw new Error("Forbidden");

  return prisma.friendship.delete({ where: { id: friendshipId } });
}

export async function getFriendshipBetween(userAId: string, userBId: string) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userAId, addresseeId: userBId },
        { requesterId: userBId, addresseeId: userAId },
      ],
    },
  });
}

export async function listFriends(userId: string): Promise<FriendEntry[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, username: true, avatarUrl: true } },
      addressee: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const friendUsers = rows.map((f) => (f.requesterId === userId ? f.addressee : f.requester));
  const friendIds = friendUsers.map((u) => u.id);

  const statsRows = await prisma.userStats.findMany({
    where: { userId: { in: friendIds } },
    select: { userId: true, levelIdx: true, uniquePeaks: true, totalEp: true, totalCairns: true },
  });
  const statsMap = new Map(statsRows.map((s) => [s.userId, s]));

  return rows.map((f) => {
    const u = f.requesterId === userId ? f.addressee : f.requester;
    const s = statsMap.get(u.id);
    return {
      id: f.id,
      friend: {
        id: u.id,
        name: u.name,
        username: u.username,
        avatarUrl: u.avatarUrl ?? null,
        levelIdx: s?.levelIdx ?? 1,
        uniquePeaks: s?.uniquePeaks ?? 0,
        totalEp: s?.totalEp ?? 0,
        totalCairns: s?.totalCairns ?? 0,
      },
      isRequester: f.requesterId === userId,
      createdAt: f.createdAt,
    };
  });
}

export async function listIncomingRequests(userId: string) {
  return prisma.friendship.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    include: {
      requester: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listSentRequests(userId: string) {
  return prisma.friendship.findMany({
    where: { requesterId: userId, status: "PENDING" },
    include: {
      addressee: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listBlockedUsers(userId: string) {
  return prisma.friendship.findMany({
    where: { requesterId: userId, status: "BLOCKED" },
    include: {
      addressee: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function countPendingRequests(userId: string): Promise<number> {
  return prisma.friendship.count({
    where: { addresseeId: userId, status: "PENDING" },
  });
}
