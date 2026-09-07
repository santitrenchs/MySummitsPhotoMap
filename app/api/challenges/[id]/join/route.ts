import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { joinChallenge, leaveChallenge } from "@/lib/services/challenge.service";

// POST /api/challenges/[id]/join — join. Idempotent.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await joinChallenge(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    // Missing and inactive both answer 404: a retired challenge must not be joinable,
    // and its existence is not worth confirming to whoever guessed the id.
    if (/not found|not available/i.test(message)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[api/challenges/[id]/join POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/challenges/[id]/join — leave. Idempotent; progress is recomputed on rejoin
// because it was never stored in the first place.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await leaveChallenge(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/challenges/[id]/join DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
