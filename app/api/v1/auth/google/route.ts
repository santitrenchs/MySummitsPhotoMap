import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { SignJWT } from "jose";
import { generateUniqueSlug, generateUniqueUsername } from "@/lib/utils/user-utils";
import { sendWelcomeEmail } from "@/lib/email";

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface GoogleTokenInfo {
  sub: string;
  email: string;
  email_verified: string;
  name?: string;
  picture?: string;
  aud: string;
  error?: string;
}

type UserWithMembership = Awaited<ReturnType<typeof findUserByGoogleOrEmail>>;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findUserByGoogleOrEmail(googleId: string, email: string) {
  // 1. Try by linked Google account
  const account = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: googleId } },
    include: {
      user: { include: { memberships: { select: { tenantId: true }, take: 1 } } },
    },
  });
  if (account) return account.user;

  // 2. Fallback: try by email (user registered with password first)
  return prisma.user.findUnique({
    where: { email },
    include: { memberships: { select: { tenantId: true }, take: 1 } },
  });
}

async function createGoogleUser(googleId: string, email: string, name: string) {
  return prisma.$transaction(async (tx) => {
    const username = await generateUniqueUsername(name);
    const user = await tx.user.create({
      data: { email, name, username, emailVerified: new Date() },
    });
    const slug = await generateUniqueSlug(name);
    const tenant = await tx.tenant.create({ data: { name, slug } });
    await tx.membership.create({
      data: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
    });
    await tx.account.create({
      data: { userId: user.id, type: "oauth", provider: "google", providerAccountId: googleId },
    });
    sendWelcomeEmail(email, name, "es").catch((err) =>
      console.error("[v1/auth/google] welcome email failed:", err)
    );
    return tx.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { memberships: { select: { tenantId: true }, take: 1 } },
    });
  });
}

async function ensureGoogleAccount(userId: string, googleId: string) {
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: googleId } },
    create: { userId, type: "oauth", provider: "google", providerAccountId: googleId },
    update: {},
  });
}

// ── POST /api/v1/auth/google ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { idToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { idToken } = body;
  if (!idToken) {
    return NextResponse.json({ error: "missing_id_token" }, { status: 400 });
  }

  // 1. Verify ID token with Google's tokeninfo endpoint
  let tokenInfo: GoogleTokenInfo;
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    tokenInfo = await res.json();
  } catch {
    return NextResponse.json({ error: "google_unreachable" }, { status: 502 });
  }

  if (tokenInfo.error || tokenInfo.email_verified !== "true") {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  // Security: verify the token was issued for our app (Web Client ID)
  const webClientId = process.env.GOOGLE_CLIENT_ID;
  if (webClientId && tokenInfo.aud !== webClientId) {
    console.error("[v1/auth/google] aud mismatch:", tokenInfo.aud);
    return NextResponse.json({ error: "token_audience_mismatch" }, { status: 401 });
  }

  const { sub: googleId, email, name } = tokenInfo;

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "server_error", detail: "missing AUTH_SECRET" }, { status: 500 });
  }

  // 2. Find or create user
  let user: NonNullable<UserWithMembership>;
  try {
    const found = await findUserByGoogleOrEmail(googleId, email);
    if (!found) {
      user = await createGoogleUser(googleId, email, name ?? email);
    } else {
      user = found;
      // Link Google account if user registered with password first
      await ensureGoogleAccount(user.id, googleId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[v1/auth/google] db error:", msg);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // 3. Issue JWT (same format as /api/v1/auth/login)
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
