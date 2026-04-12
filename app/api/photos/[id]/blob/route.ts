import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getTenantConnection } from "@/lib/db/tenant-resolver";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getTenantConnection(session.user.tenantId);
  const photo = await db.photo.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: { url: true },
  });

  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const upstream = await fetch(photo.url);
  if (!upstream.ok) return NextResponse.json({ error: "Failed to fetch photo" }, { status: 502 });

  const blob = await upstream.blob();
  return new NextResponse(blob, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
