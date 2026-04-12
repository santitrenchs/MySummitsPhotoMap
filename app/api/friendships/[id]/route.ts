import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { respondToFriendRequest, removeFriendship, blockUser, unblockUser } from "@/lib/services/friendship.service";

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
      // id here is the userId to block
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
