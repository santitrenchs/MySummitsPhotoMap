import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return dbUser?.isAdmin ? session : null;
}

// PATCH /api/admin/peaks/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("name"          in body) data.name          = body.name          ?? null;
  if ("latitude"      in body) data.latitude      = body.latitude      != null ? parseFloat(body.latitude)  : null;
  if ("longitude"     in body) data.longitude     = body.longitude     != null ? parseFloat(body.longitude) : null;
  if ("altitudeM"     in body) data.altitudeM     = body.altitudeM     != null ? parseInt(body.altitudeM)   : null;
  if ("country"       in body) data.country       = body.country       ?? "ES";
  if ("mountainRange" in body) data.mountainRange = body.mountainRange ?? null;
  if ("comarca"       in body) data.comarca       = body.comarca       ?? null;
  if ("tag1"          in body) data.tag1          = body.tag1          ?? null;
  if ("tag2"          in body) data.tag2          = body.tag2          ?? null;
  if ("tag3"          in body) data.tag3          = body.tag3          ?? null;
  if ("gpsVerified"   in body) data.gpsVerified   = Boolean(body.gpsVerified);
  if ("isMythic"      in body) data.isMythic      = Boolean(body.isMythic);

  const peak = await prisma.peak.update({ where: { id }, data });
  return NextResponse.json(peak);
}

// DELETE /api/admin/peaks/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const peak = await prisma.peak.findUnique({
    where: { id },
    select: { _count: { select: { ascents: true } } },
  });
  if (!peak) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (peak._count.ascents > 0)
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${peak._count.ascents} ascensión(es) vinculada(s).` },
      { status: 409 }
    );

  await prisma.peak.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
