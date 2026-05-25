import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { SignJWT } from "jose";

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: { select: { tenantId: true }, take: 1 },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "db_error", detail: msg }, { status: 500 });
  }

  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "server_error", detail: "missing AUTH_SECRET" }, { status: 500 });
  }

  const tenantId = user.memberships[0]?.tenantId ?? null;
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({ id: user.id, email: user.email, name: user.name, tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .sign(new TextEncoder().encode(secret));

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      tenantId,
    },
  });
}
