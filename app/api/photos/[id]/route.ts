import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deletePhoto } from "@/lib/services/photo.service";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await deletePhoto(session.user.tenantId, id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
