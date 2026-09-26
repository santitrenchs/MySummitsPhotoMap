import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const SendRequestSchema = z.object({ addresseeId: z.string().min(1) });
import {
  listFriends,
  listIncomingRequests,
  listSentRequests,
  listBlockedUsers,
  sendFriendRequest,
} from "@/lib/services/friendship.service";
import { notifyFriendRequest } from "@/lib/services/notify.service";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [friends, incoming, sent, blocked] = await Promise.all([
    listFriends(session.user.id),
    listIncomingRequests(session.user.id),
    listSentRequests(session.user.id),
    listBlockedUsers(session.user.id),
  ]);

  return NextResponse.json({ friends, incoming, sent, blocked });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = SendRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { addresseeId } = parsed.data;

  try {
    const friendship = await sendFriendRequest(session.user.id, addresseeId);

    notifyFriendRequest(addresseeId, session.user.id);

    return NextResponse.json(friendship);
  } catch (err) {
    console.error("[friendships POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
