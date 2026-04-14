import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { prisma } from "@/lib/db/client";

// ── Rate limiting (in-memory, per IP) ────────────────────────────────────────
// Max 10 attempts per IP within a 15-minute window.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// ── JWT signing ───────────────────────────────────────────────────────────────
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
const TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

async function signRegistrationToken(voucherId: string): Promise<string> {
  return new SignJWT({ voucherId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .setSubject("registration")
    .sign(SECRET);
}

// ── Schema ────────────────────────────────────────────────────────────────────
const Schema = z.object({
  code: z.string().min(1).max(20),
});

const INVALID_MSG = "Código inválido o ya utilizado. Comprueba que lo escribiste bien.";

// ── POST /api/auth/validate-voucher ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  try {
    const { code } = Schema.parse(await req.json());

    // Normalize: trim + uppercase (accept codes with or without dashes)
    const normalized = code.trim().toUpperCase();

    const voucher = await prisma.voucher.findUnique({
      where: { code: normalized },
      select: { id: true, maxUses: true, usedCount: true, expiresAt: true },
    });

    // Never reveal whether a code exists or was exhausted — same generic message
    if (!voucher) {
      return NextResponse.json({ error: INVALID_MSG }, { status: 400 });
    }
    if (voucher.usedCount >= voucher.maxUses) {
      return NextResponse.json({ error: INVALID_MSG }, { status: 400 });
    }
    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
      return NextResponse.json({ error: INVALID_MSG }, { status: 400 });
    }

    const registrationToken = await signRegistrationToken(voucher.id);

    return NextResponse.json({ registrationToken });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: INVALID_MSG }, { status: 400 });
    }
    console.error("[validate-voucher]", err);
    return NextResponse.json({ error: "Error interno. Inténtalo de nuevo." }, { status: 500 });
  }
}
