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

  const parsed = SendRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { addresseeId } = parsed.data;

  try {
    const friendship = await sendFriendRequest(session.user.id, addresseeId);

    const addressee = await prisma.user.findUnique({
      where: { id: addresseeId },
      select: { email: true, emailNotifications: true, language: true },
    });

    if (addressee?.emailNotifications) {
      sendFriendRequestEmail(
        addressee.email,
        session.user.name ?? session.user.email ?? "",
        addressee.language,
      ).catch((e) => console.error("[friendships] email failed:", e));
    }

    return NextResponse.json(friendship);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
