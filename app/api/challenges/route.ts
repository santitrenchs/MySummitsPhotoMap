import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listChallenges } from "@/lib/services/challenge.service";
import { getLocale } from "@/lib/i18n/server";

// GET /api/challenges → { mine, available }
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await listChallenges(session.user.id, await getLocale());
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/challenges GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
