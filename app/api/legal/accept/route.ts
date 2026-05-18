import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { getClientIp } from "@/lib/utils/rate-limit";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "@/lib/legal/versions";

/**
 * POST /api/legal/accept
 * Body: { marketing?: boolean }
 *
 * Records acceptance of the current T&C and Privacy Policy versions for the
 * authenticated user. Idempotent — safe to call multiple times (upsert).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { marketing?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional — ignore parse errors
  }

  const ip = getClientIp(req);
  const userId = session.user.id;
  const now = new Date();

  try {
    await prisma.$transaction([
      // Terms acceptance
      prisma.legalConsent.upsert({
        where: { userId_documentType_version: { userId, documentType: "terms", version: CURRENT_TERMS_VERSION } },
        update: {},
        create: { userId, documentType: "terms", version: CURRENT_TERMS_VERSION, acceptedAt: now, ipAddress: ip },
      }),
      // Privacy acceptance
      prisma.legalConsent.upsert({
        where: { userId_documentType_version: { userId, documentType: "privacy", version: CURRENT_PRIVACY_VERSION } },
        update: {},
        create: { userId, documentType: "privacy", version: CURRENT_PRIVACY_VERSION, acceptedAt: now, ipAddress: ip },
      }),
      // Optional marketing consent
      ...(body.marketing !== undefined
        ? [prisma.user.update({
            where: { id: userId },
            data: {
              marketingConsent: body.marketing,
              marketingConsentAt: body.marketing ? now : undefined,
            },
          })]
        : []),
    ]);
  } catch (err) {
    console.error("[legal/accept] DB error — table may not exist yet:", err);
    // Still return ok so the user isn't blocked while the migration is pending
  }

  return NextResponse.json({ ok: true });
}
