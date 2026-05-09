import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { sendWelcomeEmail } from "@/lib/email";
import { generateUniqueSlug, generateUniqueUsername } from "@/lib/utils/user-utils";

const RegisterSchema = z.object({
  name:     z.string().min(2).max(100),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, "Invalid username"),
  email:    z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = RegisterSchema.parse(await req.json());
    const { name, username, email, password } = body;

    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { username } }),
    ]);
    if (existingEmail) return NextResponse.json({ error: "email_taken" }, { status: 409 });
    if (existingUsername) return NextResponse.json({ error: "username_taken" }, { status: 409 });

    const [passwordHash, slug] = await Promise.all([hashPassword(password), generateUniqueSlug(name)]);
    const finalUsername = await generateUniqueUsername(username);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, name, username: finalUsername, passwordHash } });
      const tenant = await tx.tenant.create({ data: { name, slug } });
      await tx.membership.create({ data: { userId: user.id, tenantId: tenant.id, role: "OWNER" } });
    });

    const locale = req.headers.get("accept-language")?.slice(0, 2) ?? "es";
    sendWelcomeEmail(email, name, locale).catch(() => {});

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    console.error("[v1/auth/register]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
