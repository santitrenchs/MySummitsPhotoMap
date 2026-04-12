import { prisma } from "@/lib/db/client";

export async function searchUsers(query: string, currentUserId: string) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  return prisma.user.findMany({
    where: {
      appearInSearch: true,
      id: { not: currentUserId },
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
