import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { encode } from "next-auth/jwt";

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

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: { select: { tenantId: true }, take: 1 },
    },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const token = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.memberships[0]?.tenantId ?? null,
    },
    secret,
    // 30 days
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      tenantId: user.memberships[0]?.tenantId ?? null,
    },
  });
}
