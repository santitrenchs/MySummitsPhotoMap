import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { SignJWT } from "jose";
import { prisma } from "@/lib/db/client";
import { generateUniqueSlug, generateUniqueUsername } from "@/lib/utils/user-utils";
import { sendWelcomeEmail } from "@/lib/email";

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

  // Verify Google ID token
  let googlePayload: { sub: string; email?: string; name?: string; picture?: string } | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const p = ticket.getPayload();
    if (!p) throw new Error("empty payload");
    googlePayload = { sub: p.sub, email: p.email, name: p.name, picture: p.picture };
  } catch (err) {
    console.error("[v1/auth/google] token verification failed:", err);
    return NextResponse.json({ error: "invalid_google_token" }, { status: 401 });
  }

  if (!googlePayload.email) {
    return NextResponse.json({ error: "no_email_in_token" }, { status: 400 });
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "server_error", detail: "missing AUTH_SECRET" }, { status: 500 });
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email: googlePayload.email },
    include: { memberships: { select: { tenantId: true }, take: 1 } },
  });

  if (user) {
    // Ensure the Google account is linked
    const existing = await prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: googlePayload.sub } },
    });
    if (!existing) {
      await prisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "google",
          providerAccountId: googlePayload.sub,
        },
      });
    }
  } else {
    // Create new user + tenant + membership + account
    user = await prisma.$transaction(async (tx) => {
      const username = await generateUniqueUsername(googlePayload!.name ?? googlePayload!.email ?? "user");
      const newUser = await tx.user.create({
        data: {
          email: googlePayload!.email!,
          name: googlePayload!.name ?? googlePayload!.email!,
          username,
          avatarUrl: googlePayload!.picture ?? null,
        },
      });
      const slug = await generateUniqueSlug(newUser.name ?? newUser.email);
      const tenant = await tx.tenant.create({
        data: { name: newUser.name ?? "My Team", slug },
      });
      await tx.membership.create({
        data: { userId: newUser.id, tenantId: tenant.id, role: "OWNER" },
      });
      await tx.account.create({
        data: {
          userId: newUser.id,
          type: "oauth",
          provider: "google",
          providerAccountId: googlePayload!.sub,
        },
      });
      return tx.user.findUniqueOrThrow({
        where: { id: newUser.id },
        include: { memberships: { select: { tenantId: true }, take: 1 } },
      });
    });

    sendWelcomeEmail(user.email, user.name, "es").catch((err) =>
      console.error("[v1/auth/google] welcome email failed:", err)
    );
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
