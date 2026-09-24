import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { getV1Locale } from "@/lib/api-v1/locale";
import { getChallengeMapPeaks } from "@/lib/services/challenge.service";

// GET /api/v1/challenges/[id]/map → { challenge: { id, name, peaks } }
//
// Coordinates only — no photos, no progress — for scoping the Atlas to one
// challenge. Deliberately unpaginated: a challenge is curated and capped at
// MAX_PEAKS_PER_CHALLENGE (500) on create, and the map needs all of them at once
// to frame the view.
//
// Same access rule as the detail: an inactive challenge the user never joined
// comes back 404 instead of leaking its peak list.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const locale = await getV1Locale(req, session.userId);
    const challenge = await getChallengeMapPeaks(id, session.userId, locale);
    if (!challenge) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ challenge });
  } catch (err) {
    console.error("[api/v1/challenges/[id]/map GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
