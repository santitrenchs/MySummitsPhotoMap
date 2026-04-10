import { auth } from "@/auth";
import { getTenantConnection } from "@/lib/db/tenant-resolver";

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
    select: { url: true },
  });
  if (!photo) return new Response("Not found", { status: 404 });

  const res = await fetch(photo.url);
  const blob = await res.blob();

  return new Response(blob, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
