import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/client";
import { sendPasswordResetEmail } from "@/lib/email";

const Schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const { email } = Schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, language: true } });

    if (!user) return NextResponse.json({ ok: true }); // never leak existence

    await prisma.passwordResetToken.deleteMany({ where: { email } });
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    await sendPasswordResetEmail(email, token, user.language);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    console.error("[v1/auth/forgot-password]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
