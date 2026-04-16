import { auth } from "@/auth";
import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { R2_PUBLIC_URL } from "@/lib/storage/r2";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const db = await getTenantConnection(session.user.tenantId);
  const photo = await db.photo.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: { originalStorageKey: true },
  });
  if (!photo) return new Response("Not found", { status: 404 });
  if (!photo.originalStorageKey) return new Response("No original available", { status: 404 });

  const originalUrl = `${R2_PUBLIC_URL}/${photo.originalStorageKey}`;
  const res = await fetch(originalUrl);
  const blob = await res.blob();

  return new Response(blob, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
