import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPeakChallengeIndex } from "@/lib/services/challenge.service";
import { getLocale } from "@/lib/i18n/server";

/**
 * GET /api/challenges/peak-index → { challenges, byPeak }
 *
 * Which retos contain each peak, for the marks on the Atlas. The payload is
 * **global** — the same bytes for every user — so it is cached by locale in the
 * service and may be held by the browser for a few minutes: an admin's edit reaching
 * a client a minute late is harmless, and it saves refetching a blob of thousands of
 * peak ids on every map visit.
 *
 * The per-user half (which of them you joined, and your progress) is NOT here; it
 * comes from GET /api/challenges and is merged on the client.
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const index = await getPeakChallengeIndex(await getLocale());
    return NextResponse.json(index, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    console.error("[api/challenges/peak-index GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
