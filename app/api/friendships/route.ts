import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  listFriends,
  listIncomingRequests,
  listSentRequests,
  listBlockedUsers,
  sendFriendRequest,
} from "@/lib/services/friendship.service";
import { prisma } from "@/lib/db/client";
import { sendFriendRequestEmail } from "@/lib/email";

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

    // Fire-and-forget email — never block the response
    prisma.user.findUnique({
      where: { id: addresseeId },
      select: { email: true, emailNotifications: true, language: true },
    }).then((addressee) => {
      if (addressee?.emailNotifications) {
        sendFriendRequestEmail(addressee.email, session.user.name ?? session.user.email, addressee.language).catch(
          (e) => console.error("[friendships] email failed:", e),
        );
      }
    }).catch((e) => console.error("[friendships] failed to fetch addressee for email:", e));

    return NextResponse.json(friendship);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
