import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

// Alphabet for voucher codes: uppercase consonants only, no ambiguous chars (0/O, 1/I)
const ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789";

function generateVoucherCode(): string {
  const segment = (len: number) =>
    Array.from({ length: len }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  return `AZIT-${segment(4)}-${segment(4)}`;
}

async function uniqueCode(): Promise<string> {
  let code = generateVoucherCode();
  while (await prisma.voucher.findUnique({ where: { code } })) {
    code = generateVoucherCode();
  }
  return code;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return dbUser?.isAdmin ? session : null;
}

// ── GET /api/admin/vouchers ───────────────────────────────────────────────────

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vouchers = await prisma.voucher.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      uses: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { usedAt: "asc" },
      },
    },
  });

  return NextResponse.json(vouchers);
}

// ── POST /api/admin/vouchers ──────────────────────────────────────────────────

const CreateSchema = z.object({
  maxUses:   z.number().int().min(1).max(100).default(1),
  note:      z.string().max(200).optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = CreateSchema.parse(await req.json());
    const code = await uniqueCode();

    const voucher = await prisma.voucher.create({
      data: {
        code,
        maxUses:   body.maxUses,
        note:      body.note ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[admin/vouchers POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
