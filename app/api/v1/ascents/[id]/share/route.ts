import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { getTenantConnection } from "@/lib/db/tenant-resolver";

// POST /api/v1/ascents/:id/share
// Marks the ascent as public so the OG share page is accessible.
// Only the owner of the ascent can call this.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getTenantConnection(session.tenantId);

  const ascent = await db.ascent.findFirst({
    where: { id, tenantId: session.tenantId, createdBy: session.userId },
    select: { id: true },
  });

  if (!ascent) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await db.ascent.update({
    where: { id },
    data: { isPublic: true },
    select: { id: true, isPublic: true },
  });

  return NextResponse.json(updated);
}
