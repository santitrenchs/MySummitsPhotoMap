import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";
import { sendFriendInvitationEmail } from "@/lib/email";

// Voucher-based invitation system has been removed.
// This endpoint now sends a friend invitation email directly without creating a voucher.
// The invitee must register normally and then find the inviter through user search.

const Schema = z.object({ email: z.string().email() });

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // No voucher model — return empty list
  return NextResponse.json({ invitations: [] });
}

export async function POST(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true, language: true },
  });

  if (email === me?.email?.toLowerCase()) {
    return NextResponse.json({ error: "cannot_invite_self" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return NextResponse.json({ status: "already_registered" });

  try {
    await sendFriendInvitationEmail(email, me?.name ?? "Un amigo", "INVITE", me?.language ?? "es");
  } catch (err) {
    console.error("[v1/invitations] email failed:", err);
    return NextResponse.json({ error: "email_send_failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "invited" }, { status: 201 });
}
