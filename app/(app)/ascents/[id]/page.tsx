import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { listPhotos } from "@/lib/services/photo.service";
import { PhotoUploader } from "@/components/photos/PhotoUploader";

export default async function AscentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const db = await getTenantConnection(session.user.tenantId);

  const ascent = await db.ascent.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      peak: { select: { name: true, altitudeM: true, mountainRange: true } },
    },
  });

  if (!ascent) notFound();

  const photos = await listPhotos(session.user.tenantId, id);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      {/* Back */}
      <Link
        href="/ascents"
        style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 20 }}
      >
        ← Back to ascents
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>
            {ascent.peak.name}
          </h1>
          <span style={{
            fontSize: 13, fontWeight: 700, color: "#0369a1",
            background: "#eff6ff", borderRadius: 20, padding: "3px 10px",
          }}>
            {ascent.peak.altitudeM.toLocaleString()} m
          </span>
        </div>
        {ascent.peak.mountainRange && (
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
            {ascent.peak.mountainRange}
          </p>
        )}
        <p style={{ fontSize: 14, color: "#374151", margin: "8px 0 0" }}>
          {new Date(ascent.date).toLocaleDateString("en-GB", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </div>

      {/* Details */}
      {(ascent.route || ascent.description) && (
        <div style={{
          background: "white", border: "1px solid #e5e7eb",
          borderRadius: 12, padding: 20, marginBottom: 32,
        }}>
          {ascent.route && (
            <p style={{ fontSize: 14, color: "#374151", margin: "0 0 8px" }}>
              <span style={{ fontWeight: 600 }}>Route: </span>{ascent.route}
            </p>
          )}
          {ascent.description && (
            <p style={{ fontSize: 14, color: "#374151", margin: 0, whiteSpace: "pre-wrap" }}>
              {ascent.description}
            </p>
          )}
        </div>
      )}

      {/* Photos */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>
          Photos
        </h2>
        <PhotoUploader
          ascentId={id}
          existingPhotos={photos.map((p) => ({ id: p.id, url: p.url }))}
        />
      </div>
    </div>
  );
}
