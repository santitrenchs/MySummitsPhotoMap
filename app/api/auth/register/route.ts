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
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

    // ── Verify registration token ──────────────────────────────────────────
    let voucherId: string;
    try {
      const { payload } = await jwtVerify(registrationToken, SECRET);
      if (payload.sub !== "registration" || typeof payload.voucherId !== "string") {
        throw new Error("invalid payload");
      }
      voucherId = payload.voucherId;
    } catch {
      return NextResponse.json(
        { error: "Sesión de registro expirada o inválida. Vuelve a introducir el código." },
        { status: 401 }
      );
    }

    // ── Check uniqueness before opening transaction ────────────────────────
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
      uniqueSlug(name),
    ]);

    // ── Atomic: user + tenant + membership + person + voucher consumption ──
    await prisma.$transaction(async (tx) => {
      // Re-validate voucher inside transaction (guard against race conditions)
      const voucher = await tx.voucher.findUnique({
        where: { id: voucherId },
        select: { id: true, maxUses: true, usedCount: true, expiresAt: true },
      });

      if (
        !voucher ||
        voucher.usedCount >= voucher.maxUses ||
        (voucher.expiresAt && voucher.expiresAt < new Date())
      ) {
        throw Object.assign(new Error("VOUCHER_INVALID"), { code: "VOUCHER_INVALID" });
      }

      const user = await tx.user.create({
        data: { email, name, username, passwordHash, voucherId },
      });

      const tenant = await tx.tenant.create({
        data: { name, slug },
      });

      await tx.membership.create({
        data: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
      });

      // Auto-create a Person linked to this user so their name appears in tagging
      await tx.person.create({
        data: { tenantId: tenant.id, name, userId: user.id },
      });

      // Consume voucher
      await tx.voucher.update({
        where: { id: voucherId },
        data: { usedCount: { increment: 1 } },
      });

      await tx.voucherUse.create({
        data: { voucherId, userId: user.id },
      });
    });

    // Fire-and-forget — a failed email must never block registration
    const acceptLang = req.headers.get("accept-language") ?? "";
    const locale = ["es", "ca", "en", "fr", "de"].find((l) => acceptLang.toLowerCase().includes(l)) ?? "es";
    sendWelcomeEmail(email, name, locale).catch((err) =>
      console.error("[register] welcome email failed:", err)
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === "VOUCHER_INVALID") {
      return NextResponse.json(
        { error: "El código de acceso ya no es válido. Inténtalo de nuevo." },
        { status: 409 }
      );
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
