import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { getV1Locale } from "@/lib/api-v1/locale";
import { listChallenges } from "@/lib/services/challenge.service";

// GET /api/v1/challenges → { mine, available }
//
// Mirror of the web route over the same service. `mine` carries progress and
// includes retired challenges — hiding those would make a user's progress vanish
// the day an admin deactivates one. `available` is only the active ones.
export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const locale = await getV1Locale(req, session.userId);
    return NextResponse.json(await listChallenges(session.userId, locale));
  } catch (err) {
    console.error("[api/v1/challenges GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
