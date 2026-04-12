import { prisma } from "@/lib/db/client";

export async function searchUsers(query: string, currentUserId: string) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // Exclude users that have any BLOCKED friendship with current user
  const blockedRelations = await prisma.friendship.findMany({
    where: {
      status: "BLOCKED",
      OR: [
        { requesterId: currentUserId },
        { addresseeId: currentUserId },
      ],
    },
    select: { requesterId: true, addresseeId: true },
  });
  const blockedIds = blockedRelations.map((f) =>
    f.requesterId === currentUserId ? f.addresseeId : f.requesterId
  );

  return prisma.user.findMany({
    where: {
      appearInSearch: true,
      id: { not: currentUserId, notIn: blockedIds },
      OR: [
        { username: { contains: trimmed, mode: "insensitive" } },
        { name: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, username: true },
    take: 20,
    orderBy: { name: "asc" },
  });
}
