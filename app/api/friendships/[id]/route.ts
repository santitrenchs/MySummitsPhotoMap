import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { respondToFriendRequest, removeFriendship, blockUser, unblockUser } from "@/lib/services/friendship.service";
import { prisma } from "@/lib/db/client";
import { sendFriendAcceptedEmail } from "@/lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action } = await req.json();

  try {
    if (action === "BLOCKED") {
      const result = await blockUser(session.user.id, id);
      return NextResponse.json(result);
    }
    if (action === "UNBLOCKED") {
      await unblockUser(session.user.id, id);
      return NextResponse.json({ ok: true });
    }
    if (action !== "ACCEPTED" && action !== "REJECTED") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await respondToFriendRequest(id, session.user.id, action);

    if (action === "ACCEPTED") {
      const requester = await prisma.user.findUnique({
        where: { id: result.requesterId },
        select: { email: true, emailNotifications: true, language: true },
      });
      if (requester?.emailNotifications) {
        sendFriendAcceptedEmail(
          requester.email,
          session.user.name ?? session.user.email ?? "",
          requester.language,
        ).catch((e) => console.error("[friendships] accepted email failed:", e));
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await removeFriendship(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
