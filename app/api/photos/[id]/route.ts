import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deletePhoto } from "@/lib/services/photo.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // keepOriginal=1 — re-crop flow: the original R2 object is reused by the new photo, don't delete it
  const keepOriginal = req.nextUrl.searchParams.get("keepOriginal") === "1";
  const deleted = await deletePhoto(session.user.tenantId, id, keepOriginal);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
