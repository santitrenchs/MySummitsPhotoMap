import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { sendWelcomeEmail } from "@/lib/email";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");

const RegisterSchema = z.object({
  name:              z.string().min(2).max(100),
  username:          z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, "Invalid username"),
  email:             z.string().email(),
  password:          z.string().min(8),
  registrationToken: z.string().min(1),
});

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${slugify(base)}-${suffix}`;
  }
  return slug;
}

export async function POST(req: NextRequest) {
  try {
    const body = RegisterSchema.parse(await req.json());
    const { name, username, email, password, registrationToken } = body;

    let voucherId: string;
    try {
      const { payload } = await jwtVerify(registrationToken, SECRET);
      if (payload.sub !== "registration" || typeof payload.voucherId !== "string") throw new Error();
      voucherId = payload.voucherId;
    } catch {
      return NextResponse.json({ error: "invalid_registration_token" }, { status: 401 });
    }

    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { username } }),
    ]);
    if (existingEmail) return NextResponse.json({ error: "email_taken" }, { status: 409 });
    if (existingUsername) return NextResponse.json({ error: "username_taken" }, { status: 409 });

    const [passwordHash, slug] = await Promise.all([hashPassword(password), uniqueSlug(name)]);

    await prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.findUnique({
        where: { id: voucherId },
        select: { id: true, maxUses: true, usedCount: true, expiresAt: true },
      });
      if (!voucher || voucher.usedCount >= voucher.maxUses || (voucher.expiresAt && voucher.expiresAt < new Date())) {
        throw Object.assign(new Error("VOUCHER_INVALID"), { code: "VOUCHER_INVALID" });
      }
      const user = await tx.user.create({ data: { email, name, username, passwordHash, voucherId } });
      const tenant = await tx.tenant.create({ data: { name, slug } });
      await tx.membership.create({ data: { userId: user.id, tenantId: tenant.id, role: "OWNER" } });
      await tx.voucher.update({ where: { id: voucherId }, data: { usedCount: { increment: 1 } } });
      await tx.voucherUse.create({ data: { voucherId, userId: user.id } });
    });

    const locale = req.headers.get("accept-language")?.slice(0, 2) ?? "es";
    sendWelcomeEmail(email, name, locale).catch(() => {});

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === "VOUCHER_INVALID") {
      return NextResponse.json({ error: "voucher_invalid" }, { status: 409 });
    }
    console.error("[v1/auth/register]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
