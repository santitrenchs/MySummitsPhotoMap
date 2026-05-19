import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);

  // Get accepted friend userIds
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: session.user.id },
        { addresseeId: session.user.id },
      ],
    },
    select: { requesterId: true, addresseeId: true },
  });
  const friendIds = friendships.map((f) =>
    f.requesterId === session.user.id ? f.addresseeId : f.requesterId
  );

  // Friends only (exclude self)
  const allowedIds = friendIds;
  const users = await prisma.user.findMany({
    where: {
      id: { in: allowedIds },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, username: true },
    take: 5,
  });

  return NextResponse.json(users);
}
