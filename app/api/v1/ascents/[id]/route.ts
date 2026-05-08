import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { deleteAscent } from "@/lib/services/ascent.service";
import { getTenantConnection } from "@/lib/db/tenant-resolver";

const PatchSchema = z.object({
  peakId:      z.string().uuid().optional(),
  route:       z.string().max(500).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getTenantConnection(session.tenantId);
  const ascent = await db.ascent.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      peak: { select: { id: true, name: true, altitudeM: true, mountainRange: true, latitude: true, longitude: true } },
      photos: { orderBy: { createdAt: "asc" }, select: { id: true, url: true } },
    },
  });

  if (!ascent) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ascent });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const db = await getTenantConnection(session.tenantId);
  const existing = await db.ascent.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const input = parsed.data;
  const data: Record<string, unknown> = {};
  if ("peakId"      in input) data.peakId      = input.peakId;
  if ("route"       in input) data.route       = input.route ?? null;
  if ("description" in input) data.description = input.description ?? null;
  if ("date"        in input) data.date        = input.date ? new Date(input.date) : null;

  const updated = await db.ascent.update({ where: { id }, data });
  return NextResponse.json({ ascent: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await deleteAscent(session.tenantId, id);
  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
