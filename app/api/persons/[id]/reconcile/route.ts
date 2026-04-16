import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getFriendshipBetween } from "@/lib/services/friendship.service";
import { reconcilePersonToUser } from "@/lib/services/person.service";
import { prisma } from "@/lib/db/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: personId } = await params;
  const { userId: targetUserId } = await req.json();

  if (!targetUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Target user must be an accepted friend
  const friendship = await getFriendshipBetween(session.user.id, targetUserId);
  if (!friendship || friendship.status !== "ACCEPTED") {
    return NextResponse.json({ error: "Not an accepted friend" }, { status: 403 });
  }

  // Get friend's display name (username takes priority)
  const friend = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { name: true, username: true },
  });
  if (!friend) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const displayName = friend.username ?? friend.name;

  try {
    const result = await reconcilePersonToUser(
      session.user.tenantId,
      personId,
      targetUserId,
      displayName,
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
