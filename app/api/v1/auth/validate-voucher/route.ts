import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { prisma } from "@/lib/db/client";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
const TOKEN_TTL_SECONDS = 15 * 60;

// In-memory rate limiting: max 10 attempts per IP per 15 min
const attempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

const Schema = z.object({ code: z.string().min(1).max(20) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  try {
    const { code } = Schema.parse(await req.json());
    const normalized = code.trim().toUpperCase();

    const voucher = await prisma.voucher.findUnique({
      where: { code: normalized },
      select: { id: true, maxUses: true, usedCount: true, expiresAt: true },
    });

    if (!voucher || voucher.usedCount >= voucher.maxUses || (voucher.expiresAt && voucher.expiresAt < new Date())) {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }

    const registrationToken = await new SignJWT({ voucherId: voucher.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
      .setSubject("registration")
      .sign(SECRET);

    return NextResponse.json({ registrationToken });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    console.error("[v1/auth/validate-voucher]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
