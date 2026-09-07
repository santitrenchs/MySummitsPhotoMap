import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getChallengeDetail } from "@/lib/services/challenge.service";

// GET /api/challenges/[id] → detail scoped to the session user.
// The user id always comes from the session, never from the request.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const challenge = await getChallengeDetail(id, session.user.id);
    // null also covers "inactive and the user is not a participant" — unpublished
    // challenges must not be reachable by guessing an id.
    if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ challenge });
  } catch (err) {
    console.error("[api/challenges/[id] GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
