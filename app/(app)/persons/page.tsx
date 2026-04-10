import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantConnection } from "@/lib/db/tenant-resolver";

export default async function PersonsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const db = await getTenantConnection(session.user.tenantId);

  const persons = await db.person.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { name: "asc" },
    include: {
      faceTags: {
        include: {
          faceDetection: {
            include: {
              photo: {
                include: {
                  ascent: {
                    include: { peak: { select: { name: true, altitudeM: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>People</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
          {persons.length} person{persons.length !== 1 ? "s" : ""} tagged in photos
        </p>
      </div>

      {persons.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 0",
          border: "1px dashed #e5e7eb", borderRadius: 12, color: "#9ca3af",
        }}>
          <p style={{ fontSize: 32, margin: "0 0 8px" }}>👥</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", margin: 0 }}>No people tagged yet</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0" }}>
            Open a photo and click Tag to detect and name faces
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {persons.map((person) => {
            // Deduplicate ascents this person appears in
            const ascentMap = new Map<string, { id: string; peakName: string; altitudeM: number; photoUrl: string }>();
            for (const tag of person.faceTags) {
              const ascent = tag.faceDetection.photo.ascent;
              if (!ascentMap.has(ascent.id)) {
                ascentMap.set(ascent.id, {
                  id: ascent.id,
                  peakName: ascent.peak.name,
                  altitudeM: ascent.peak.altitudeM,
                  photoUrl: tag.faceDetection.photo.url,
                });
              }
            }
            const ascents = Array.from(ascentMap.values());

            return (
              <div
                key={person.id}
                style={{
                  background: "white", border: "1px solid #e5e7eb",
                  borderRadius: 12, padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: ascents.length > 0 ? 14 : 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "#eff6ff", border: "1px solid #bfdbfe",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, color: "#0369a1", fontWeight: 700, flexShrink: 0,
                  }}>
                    {person.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", margin: 0 }}>
                      {person.name}
                    </p>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                      {person.faceTags.length} photo{person.faceTags.length !== 1 ? "s" : ""} · {ascents.length} ascent{ascents.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {ascents.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {ascents.map((a) => (
                      <Link
                        key={a.id}
                        href={`/ascents/${a.id}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 10px", borderRadius: 8,
                          border: "1px solid #e5e7eb", background: "#f9fafb",
                          textDecoration: "none",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.photoUrl}
                          alt=""
                          style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover" }}
                        />
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", margin: 0 }}>
                            {a.peakName}
                          </p>
                          <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
                            {a.altitudeM.toLocaleString()} m
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
