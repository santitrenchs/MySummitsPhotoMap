import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { sendWelcomeEmail, sendNewUserNotification } from "@/lib/email";
import { generateUniqueSlug, generateUsername } from "@/lib/utils/user-utils";

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
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    if (existingUsername) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const [passwordHash, slug] = await Promise.all([
      hashPassword(password),
      generateUniqueSlug(name),
    ]);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, username, passwordHash },
      });
      const tenant = await tx.tenant.create({
        data: { name, slug },
      });
      await tx.membership.create({
        data: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
      });
    });

    const acceptLang = req.headers.get("accept-language") ?? "";
    const locale = ["es", "ca", "en", "fr", "de"].find((l) => acceptLang.toLowerCase().includes(l)) ?? "es";
    sendWelcomeEmail(email, name, locale).catch((err) =>
      console.error("[register] welcome email failed:", err)
    );
    sendNewUserNotification(name, email).catch((err) =>
      console.error("[register] new user notification failed:", err)
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export { generateUsername };
