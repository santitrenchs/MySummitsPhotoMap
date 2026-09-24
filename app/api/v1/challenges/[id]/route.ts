import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { getV1Locale } from "@/lib/api-v1/locale";
import { getChallengeDetail } from "@/lib/services/challenge.service";

// GET /api/v1/challenges/[id] → { challenge }
//
// The user id always comes from the JWT. Accepting one from the query would let
// anyone read another user's done/pending list for the same challenge.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const locale = await getV1Locale(req, session.userId);
    const challenge = await getChallengeDetail(id, session.userId, locale);
    // null also covers "inactive and the user never joined": an unpublished
    // challenge must not be reachable by guessing an id, and answering 404 rather
    // than 403 avoids confirming that it exists at all.
    if (!challenge) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ challenge });
  } catch (err) {
    console.error("[api/v1/challenges/[id] GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
