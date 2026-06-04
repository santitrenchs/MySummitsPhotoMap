import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";
import { getFriendshipBetween, sendFriendRequest } from "@/lib/services/friendship.service";
import { sendFriendRequestEmail } from "@/lib/email";

const Schema = z.object({
  email: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const email = parsed.data.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ status: "not_registered" });

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true },
  });
  if (email === me?.email?.toLowerCase()) {
    return NextResponse.json({ status: "cannot_invite_self" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailNotifications: true, language: true },
  });

  if (!existingUser) return NextResponse.json({ status: "not_registered" });

  const existingFriendship = await getFriendshipBetween(session.userId, existingUser.id);
  if (existingFriendship?.status === "ACCEPTED") {
    return NextResponse.json({ status: "already_friends" });
  }
  if (existingFriendship?.status === "PENDING") {
    return NextResponse.json({ status: "request_pending" });
  }

  try {
    await sendFriendRequest(session.userId, existingUser.id);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  if (existingUser.emailNotifications) {
    sendFriendRequestEmail(
      existingUser.email,
      me?.name ?? me?.email ?? "",
      existingUser.language,
    ).catch((e) => console.error("[v1/invitations/resolve] email failed:", e));
  }

  return NextResponse.json({ status: "friend_request_sent" }, { status: 201 });
}
