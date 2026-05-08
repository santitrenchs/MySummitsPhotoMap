import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { respondToFriendRequest, removeFriendship, blockUser, unblockUser } from "@/lib/services/friendship.service";
import { prisma } from "@/lib/db/client";
import { sendFriendAcceptedEmail } from "@/lib/email";

const ActionSchema = z.object({
  action: z.enum(["ACCEPTED", "REJECTED", "BLOCKED", "UNBLOCKED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = ActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { action } = parsed.data;
  try {
    if (action === "BLOCKED") {
      return NextResponse.json(await blockUser(session.userId, id));
    }
    if (action === "UNBLOCKED") {
      await unblockUser(session.userId, id);
      return NextResponse.json({ ok: true });
    }

    const result = await respondToFriendRequest(id, session.userId, action);

    if (action === "ACCEPTED") {
      const requester = await prisma.user.findUnique({
        where: { id: result.requesterId },
        select: { email: true, emailNotifications: true, language: true },
      });
      const me = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true },
      });
      if (requester?.emailNotifications) {
        sendFriendAcceptedEmail(
          requester.email,
          me?.name ?? me?.email ?? "",
          requester.language,
        ).catch(() => {});
      }
    }

    return NextResponse.json({ friendship: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await removeFriendship(id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
