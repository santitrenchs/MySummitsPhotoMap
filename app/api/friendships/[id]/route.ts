import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const FriendshipActionSchema = z.object({
  action: z.enum(["ACCEPTED", "REJECTED", "BLOCKED", "UNBLOCKED"]),
});
import { respondToFriendRequest, removeFriendship, blockUser, unblockUser } from "@/lib/services/friendship.service";
import { notifyFriendAccepted } from "@/lib/services/notify.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = FriendshipActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { action } = parsed.data;

  try {
    if (action === "BLOCKED") {
      const result = await blockUser(session.user.id, id);
      return NextResponse.json(result);
    }
    if (action === "UNBLOCKED") {
      await unblockUser(session.user.id, id);
      return NextResponse.json({ ok: true });
    }


    const result = await respondToFriendRequest(id, session.user.id, action);

    if (action === "ACCEPTED") {
      notifyFriendAccepted(result.requesterId, session.user.id);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[friendships PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    console.error("[friendships DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
