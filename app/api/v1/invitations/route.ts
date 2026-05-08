import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";
import { sendFriendInvitationEmail } from "@/lib/email";

const Schema = z.object({ email: z.string().email() });

const ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789";
function generateVoucherCode(): string {
  const seg = (n: number) => Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  return `AZIT-${seg(4)}-${seg(4)}`;
}
async function uniqueCode(): Promise<string> {
  let code = generateVoucherCode();
  while (await prisma.voucher.findUnique({ where: { code } })) code = generateVoucherCode();
  return code;
}

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const invitations = await prisma.voucher.findMany({
    where: { inviterId: session.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, inviteeEmail: true, usedCount: true, expiresAt: true, createdAt: true },
  });

  return NextResponse.json({ invitations });
}

export async function POST(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true, name: true, language: true } });

  if (email === me?.email?.toLowerCase()) {
    return NextResponse.json({ error: "cannot_invite_self" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return NextResponse.json({ status: "already_registered" });

  const activeInvitation = await prisma.voucher.findFirst({
    where: { inviterId: session.userId, inviteeEmail: email, usedCount: 0, expiresAt: { gt: new Date() } },
  });
  if (activeInvitation) return NextResponse.json({ status: "already_invited", expiresAt: activeInvitation.expiresAt });

  const code = await uniqueCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    await sendFriendInvitationEmail(email, me?.name ?? "Un amigo", code, me?.language ?? "es");
  } catch (err) {
    console.error("[v1/invitations] email failed:", err);
    return NextResponse.json({ error: "email_send_failed" }, { status: 500 });
  }

  await prisma.voucher.create({
    data: { code, maxUses: 1, expiresAt, inviterId: session.userId, inviteeEmail: email, note: `Invitación de ${me?.name} a ${email}` },
  });

  return NextResponse.json({ status: "invited", expiresAt }, { status: 201 });
}
