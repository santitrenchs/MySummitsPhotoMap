import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { sendFriendInvitationEmail } from "@/lib/email";

const InvitationSchema = z.object({ email: z.string().email() });

const ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789";

function generateVoucherCode(): string {
  const segment = (len: number) =>
    Array.from({ length: len }, () =>
      ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
    ).join("");
  return `AZIT-${segment(4)}-${segment(4)}`;
}

async function uniqueCode(): Promise<string> {
  let code = generateVoucherCode();
  while (await prisma.voucher.findUnique({ where: { code } })) {
    code = generateVoucherCode();
  }
  return code;
}

// ── POST /api/invitations ─────────────────────────────────────────────────────
// Creates a single-use voucher and sends an invitation email.

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = InvitationSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();

  const inviterId = session.user.id;

  if (email === session.user.email?.toLowerCase()) {
    return NextResponse.json({ error: "No puedes invitarte a ti mismo" }, { status: 400 });
  }

  // Check if email is already a registered user
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { status: "already_registered", message: "Este email ya tiene una cuenta en AziAtlas" },
      { status: 200 },
    );
  }

  // Reuse active invitation if one exists for this inviter+email
  const activeInvitation = await prisma.voucher.findFirst({
    where: {
      inviterId,
      inviteeEmail: email,
      usedCount: 0,
      expiresAt: { gt: new Date() },
    },
  });

  if (activeInvitation) {
    return NextResponse.json(
      { status: "already_invited", expiresAt: activeInvitation.expiresAt },
      { status: 200 },
    );
  }

  // Get inviter name
  const inviter = await prisma.user.findUnique({
    where: { id: inviterId },
    select: { name: true, language: true },
  });

  const inviterName = inviter?.name ?? "Un amigo";
  const code = await uniqueCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Send email first — only persist the voucher if it succeeds
  try {
    await sendFriendInvitationEmail(email, inviterName, code, inviter?.language ?? "es");
  } catch (err) {
    console.error("[invitations] email send failed:", err);
    return NextResponse.json({ error: "Error al enviar el email" }, { status: 500 });
  }

  await prisma.voucher.create({
    data: {
      code,
      maxUses: 1,
      expiresAt,
      inviterId,
      inviteeEmail: email,
      note: `Invitación de ${inviterName} a ${email}`,
    },
  });

  return NextResponse.json({ status: "invited", expiresAt }, { status: 201 });
}

// ── GET /api/invitations ──────────────────────────────────────────────────────
// Returns all invitations sent by the current user.

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invitations = await prisma.voucher.findMany({
    where: { inviterId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      inviteeEmail: true,
      usedCount: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(invitations);
}
