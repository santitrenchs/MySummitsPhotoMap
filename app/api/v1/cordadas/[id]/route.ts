import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { getCordadaDetail, deleteCordada } from "@/lib/services/cordada.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const detail = await getCordadaDetail(id, session.userId);
  if (!detail) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ cordada: detail });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteCordada(id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    const status = msg === "Only the owner can delete" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
