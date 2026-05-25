import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { generateUniqueSlug, generateUniqueUsername } from "@/lib/utils/user-utils";
import { sendWelcomeEmail } from "@/lib/email";

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const RegisterSchema = z.object({
  name:        z.string().min(2).max(100),
  email:       z.string().email(),
  password:    z.string().min(8),
  voucherCode: z.string().optional(), // kept for API compat, ignored (system removed)
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "email_taken" }, { status: 409 });

  const [passwordHash, slug, username] = await Promise.all([
    hashPassword(password),
    generateUniqueSlug(name),
    generateUniqueUsername(name),
  ]);

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "server_error", detail: "missing AUTH_SECRET" }, { status: 500 });
  }

  let userId: string;
  let tenantId: string | null;

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, name, username, passwordHash } });
      const tenant = await tx.tenant.create({ data: { name, slug } });
      await tx.membership.create({ data: { userId: user.id, tenantId: tenant.id, role: "OWNER" } });
      userId = user.id;
      tenantId = tenant.id;
    });
  } catch (err) {
    console.error("[v1/auth/register]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const locale = req.headers.get("accept-language")?.slice(0, 2) ?? "es";
  sendWelcomeEmail(email, name, locale).catch(() => {});

  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ id: userId!, email, name, tenantId: tenantId! })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .sign(new TextEncoder().encode(secret));

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { id: true, email: true, name: true, username: true, avatarUrl: true },
  });

  return NextResponse.json({ token, user: { ...user, tenantId: tenantId! } }, { status: 201 });
}
