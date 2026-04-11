import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteAscent } from "@/lib/services/ascent.service";
import { getTenantConnection } from "@/lib/db/tenant-resolver";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const db = await getTenantConnection(session.user.tenantId);
  const existing = await db.ascent.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.ascent.update({
    where: { id },
    data: {
      route: body.route ?? null,
      description: body.description ?? null,
      wikiloc: body.wikiloc ?? null,
      date: body.date ? new Date(body.date) : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await deleteAscent(session.user.tenantId, id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
