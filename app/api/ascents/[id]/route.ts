import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { deleteAscent } from "@/lib/services/ascent.service";
import { getTenantConnection } from "@/lib/db/tenant-resolver";

const PatchSchema = z.object({
  peakId:      z.string().uuid().optional(),
  route:       z.string().max(500).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  wikiloc:     z.string().max(500).nullable().optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

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

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const db = await getTenantConnection(session.user.tenantId);
  const existing = await db.ascent.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const input = parsed.data;
  const data: Record<string, unknown> = {};
  if ("peakId"      in input) data.peakId      = input.peakId;
  if ("route"       in input) data.route       = input.route ?? null;
  if ("description" in input) data.description = input.description ?? null;
  if ("wikiloc"     in input) data.wikiloc     = input.wikiloc ?? null;
  if ("date"        in input) data.date        = input.date ? new Date(input.date) : null;

  const updated = await db.ascent.update({ where: { id }, data });

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
