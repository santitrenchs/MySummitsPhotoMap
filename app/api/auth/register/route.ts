import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { sendWelcomeEmail, sendNewUserNotification } from "@/lib/email";
import { generateUniqueSlug, generateUsername } from "@/lib/utils/user-utils";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "@/lib/legal/versions";

// Max 5 registration attempts per IP per 15 minutes
const isRateLimited = createRateLimiter(5, 15 * 60 * 1000);

const RegisterSchema = z.object({
  name:            z.string().min(2).max(100),
  username:        z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, "Invalid username"),
  email:           z.string().email(),
  password:        z.string().min(8),
  acceptedTerms:   z.literal(true, { errorMap: () => ({ message: "Must accept terms" }) }),
  acceptedPrivacy: z.literal(true, { errorMap: () => ({ message: "Must accept privacy policy" }) }),
  marketing:       z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  try {
    const body = RegisterSchema.parse(await req.json());
    const { name, username, email, password, marketing } = body;

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

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email, name, username, passwordHash,
          marketingConsent: marketing,
          marketingConsentAt: marketing ? now : undefined,
        },
      });

      const tenant = await tx.tenant.create({
        data: { name, slug },
      });

      await tx.membership.create({
        data: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
      });

      // Record legal consent
      await tx.legalConsent.createMany({
        data: [
          { userId: user.id, documentType: "terms",   version: CURRENT_TERMS_VERSION,   acceptedAt: now, ipAddress: ip },
          { userId: user.id, documentType: "privacy",  version: CURRENT_PRIVACY_VERSION, acceptedAt: now, ipAddress: ip },
        ],
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
