import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  listFriends,
  listIncomingRequests,
  listSentRequests,
  listBlockedUsers,
  sendFriendRequest,
} from "@/lib/services/friendship.service";

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

  const { addresseeId } = await req.json();
  if (!addresseeId) return NextResponse.json({ error: "addresseeId required" }, { status: 400 });

  try {
    const friendship = await sendFriendRequest(session.user.id, addresseeId);
    return NextResponse.json(friendship);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
