import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/client";
import { sendPasswordResetEmail } from "@/lib/email";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";

// Max 3 reset requests per IP per 15 minutes
const isRateLimited = createRateLimiter(3, 15 * 60 * 1000);

const Schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    // Return 200 to avoid leaking whether the email exists
    return NextResponse.json({ ok: true });
  }

  try {
    const { email } = Schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, language: true },
    });

    // Always return 200 — never leak whether an email exists
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    // Invalidate any previous tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    });

    await sendPasswordResetEmail(email, token, user.language);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
