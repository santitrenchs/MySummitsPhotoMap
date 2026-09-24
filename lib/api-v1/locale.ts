import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { isValidLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";

const FALLBACK: Locale = "es";

/**
 * The locale to render server-side text in for a mobile request.
 *
 * `Accept-Language` wins, `User.language` is the fallback. That order matters,
 * and it is the opposite of what looks obvious:
 *
 * - The header says what the client is rendering **right now**. The stored
 *   preference only says what it was the last time the user changed it inside
 *   the app — and on Android 13+ the per-app language can be changed from system
 *   settings, which never reaches `PATCH /api/v1/settings`. Trusting the stored
 *   value there would serve challenge names in the old language under a UI in
 *   the new one.
 * - Android sends no `Accept-Language` today (OkHttp adds none by default), so
 *   in practice this falls straight through to `User.language`, which the app
 *   does keep in sync via `saveLanguage`. Adding the header later in the
 *   interceptor is a one-line upgrade that needs no server change.
 *
 * The header is parsed leniently: it can be a whole ranked list like
 * `ca-ES,ca;q=0.9,es;q=0.8`, so we take the first tag we actually support.
 */
export async function getV1Locale(req: NextRequest, userId: string): Promise<Locale> {
  const fromHeader = localeFromHeader(req.headers.get("accept-language"));
  if (fromHeader) return fromHeader;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    if (user?.language && isValidLocale(user.language)) return user.language;
  } catch {
    // A locale is never worth failing a request over.
  }

  return FALLBACK;
}

/** null — not FALLBACK — when the header is absent or names no supported locale,
 *  so the caller can tell "the client said nothing" from "the client said es". */
function localeFromHeader(header: string | null): Locale | null {
  if (!header) return null;

  for (const part of header.split(",")) {
    // "ca-ES;q=0.9" → "ca"
    const tag = part.split(";")[0].trim().split("-")[0].toLowerCase();
    if (isValidLocale(tag)) return tag;
  }
  return null;
}
