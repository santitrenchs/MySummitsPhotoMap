import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";

const isRateLimited = createRateLimiter(5, 60 * 60 * 1000); // 5 signups per IP per hour

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: { email?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const locale = (body.locale ?? "es").slice(0, 5);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {},        // already subscribed — no-op, return success
      create: { email, locale },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
