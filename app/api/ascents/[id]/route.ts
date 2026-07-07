import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteAscent } from "@/lib/services/ascent.service";
import { AscentPatchSchema, buildAscentPatchData } from "@/lib/services/ascent-patch";
import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { recomputeUserStats } from "@/lib/services/stats.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AscentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const db = await getTenantConnection(session.user.tenantId);
  const existing = await db.ascent.findFirst({
    where: { id, tenantId: session.user.tenantId, createdBy: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const input = parsed.data;
  const data = buildAscentPatchData(input);

  const updated = await db.ascent.update({ where: { id }, data });

  // Recompute only if peakId changed (the only field that affects cached stats)
  if ("peakId" in input) await recomputeUserStats(session.user.id);

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await deleteAscent(session.user.tenantId, id, session.user.id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recomputeUserStats(session.user.id);
  return NextResponse.json({ ok: true });
}
