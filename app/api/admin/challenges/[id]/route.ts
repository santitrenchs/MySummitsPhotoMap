import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  adminGetChallenge,
  updateChallenge,
  deleteChallenge,
  type ChallengeInput,
} from "@/lib/services/challenge.service";

// GET /api/admin/challenges/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const challenge = await adminGetChallenge(id);
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ challenge });
}

// PATCH /api/admin/challenges/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Field isolation: only what the body actually carries gets touched.
  const input: Partial<ChallengeInput> = {};
  if ("name" in body) input.name = String(body.name ?? "");
  if ("description" in body) input.description = body.description ?? null;
  if ("coverUrl" in body) input.coverUrl = body.coverUrl ?? null;
  if ("sortOrder" in body) input.sortOrder = Number(body.sortOrder) || 0;
  if ("isActive" in body) input.isActive = Boolean(body.isActive);
  if ("peakIds" in body) {
    input.peakIds = Array.isArray(body.peakIds)
      ? body.peakIds.filter((p: unknown): p is string => typeof p === "string")
      : [];
  }

  try {
    await updateChallenge(id, input);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/not found/i.test(message)) return NextResponse.json({ error: message }, { status: 404 });
    const isValidation = /peak|name/i.test(message);
    if (!isValidation) console.error("[admin/challenges PATCH]", err);
    return NextResponse.json(
      { error: isValidation ? message : "Internal server error" },
      { status: isValidation ? 400 : 500 },
    );
  }
}

// DELETE /api/admin/challenges/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const challenge = await adminGetChallenge(id);
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await deleteChallenge(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/challenges DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
