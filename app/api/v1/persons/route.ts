import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";

// Returns self + accepted friends — the candidate list for manual photo tagging.
export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: session.userId },
        { addresseeId: session.userId },
      ],
    },
    select: { requesterId: true, addresseeId: true },
  });
  const friendIds = friendships.map((f) =>
    f.requesterId === session.userId ? f.addresseeId : f.requesterId
  );

  const users = await prisma.user.findMany({
    where: { id: { in: [session.userId, ...friendIds] } },
    select: { id: true, name: true, username: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });

  // Self first
  const sorted = [
    ...users.filter((u) => u.id === session.userId),
    ...users.filter((u) => u.id !== session.userId),
  ];

  return NextResponse.json({ persons: sorted });
}
