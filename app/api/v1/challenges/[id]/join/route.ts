import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { joinChallenge, leaveChallenge } from "@/lib/services/challenge.service";

// POST /api/v1/challenges/[id]/join — join. Idempotent.
//
// The user id comes from the JWT and nowhere else: taking it from the body would
// let anyone enrol third parties.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await joinChallenge(session.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    // Missing and inactive both answer 404: a retired challenge must not be
    // joinable through an id kept from an older listing.
    if (/not found|not available/i.test(message)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("[api/v1/challenges/[id]/join POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/v1/challenges/[id]/join — leave. Idempotent; progress reappears on
// rejoin because it is computed from ascents and was never stored.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await leaveChallenge(session.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/v1/challenges/[id]/join DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
