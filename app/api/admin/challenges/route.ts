import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminListChallenges, createChallenge } from "@/lib/services/challenge.service";

// GET /api/admin/challenges
export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenges = await adminListChallenges();
  return NextResponse.json({ challenges });
}

// POST /api/admin/challenges
export async function POST(req: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Explicit whitelist — never hand the request body straight to Prisma.
  const peakIds = Array.isArray(body.peakIds)
    ? body.peakIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  try {
    const created = await createChallenge({
      name: typeof body.name === "string" ? body.name : "",
      description: typeof body.description === "string" ? body.description : null,
      coverUrl: typeof body.coverUrl === "string" ? body.coverUrl : null,
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      peakIds,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    // Validation errors carry a safe, actionable message; anything else stays generic.
    const message = err instanceof Error ? err.message : "";
    const isValidation = /peak|name/i.test(message);
    if (!isValidation) console.error("[admin/challenges POST]", err);
    return NextResponse.json(
      { error: isValidation ? message : "Internal server error" },
      { status: isValidation ? 400 : 500 },
    );
  }
}
