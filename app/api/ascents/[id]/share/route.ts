import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantConnection } from "@/lib/db/tenant-resolver";

// POST /api/ascents/[id]/share  { isPublic: boolean }
// Toggles the public sharing state of an ascent.
// Only the owner of the ascent can change this.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const isPublic = (body as { isPublic?: unknown }).isPublic;
  if (typeof isPublic !== "boolean") {
    return NextResponse.json({ error: "isPublic must be a boolean" }, { status: 400 });
  }

  // Resolve tenant from session membership
  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const db = await getTenantConnection(tenantId);

  // Ensure the ascent belongs to this user & tenant
  const ascent = await db.ascent.findFirst({
    where: { id, tenantId, createdBy: session.user.id },
    select: { id: true },
  });

  if (!ascent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.ascent.update({
    where: { id },
    data: { isPublic },
    select: { id: true, isPublic: true },
  });

  return NextResponse.json(updated);
}
