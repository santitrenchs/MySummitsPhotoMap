import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getPersonDetails } from "@/lib/services/person.service";
import { getServerT } from "@/lib/i18n/server";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const t = await getServerT();
  const person = await getPersonDetails(session.user.tenantId, id);
  if (!person) notFound();

  // Group photos by ascent
  const ascentMap = new Map<string, {
    id: string;
    date: Date;
    peakName: string;
    altitudeM: number;
    mountainRange: string | null;
    photos: { id: string; url: string }[];
  }>();
  for (const tag of person.faceTags) {
    const photo = tag.faceDetection.photo;
    const ascent = photo.ascent;
    if (!ascentMap.has(ascent.id)) {
      ascentMap.set(ascent.id, {
        id: ascent.id,
        date: ascent.date,
        peakName: ascent.peak.name,
        altitudeM: ascent.peak.altitudeM,
        mountainRange: ascent.peak.mountainRange,
        photos: [],
      });
    }
    const entry = ascentMap.get(ascent.id)!;
    if (!entry.photos.find((p) => p.id === photo.id)) {
      entry.photos.push({ id: photo.id, url: photo.url });
    }
  }

  const ascents = Array.from(ascentMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const highestPeak = ascents.reduce<typeof ascents[0] | null>(
    (best, a) => (!best || a.altitudeM > best.altitudeM ? a : best),
    null
  );

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <Link
        href="/persons"
        style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 20 }}
      >
        ← Back to people
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "#eff6ff", border: "1px solid #bfdbfe",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, color: "#0369a1", fontWeight: 700, flexShrink: 0,
        }}>
          {person.name[0]?.toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>{person.name}</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            {person.faceTags.length} photo{person.faceTags.length !== 1 ? "s" : ""} · {ascents.length} ascent{ascents.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 32 }}>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{ascents.length}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Ascents together</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{person.faceTags.length}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Photos tagged</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {highestPeak ? `${highestPeak.peakName} (${highestPeak.altitudeM.toLocaleString(t.dateLocale)} m)` : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Highest peak</div>
        </div>
      </div>

      {/* Ascent timeline */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Ascents</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {ascents.map((a) => (
          <Link
            key={a.id}
            href={`/ascents/${a.id}`}
            style={{ textDecoration: "none" }}
          >
            <div style={{
              background: "white", border: "1px solid #e5e7eb", borderRadius: 12,
              padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{a.peakName}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "#0369a1",
                  background: "#eff6ff", borderRadius: 20, padding: "2px 7px",
                }}>
                  {a.altitudeM.toLocaleString(t.dateLocale)} m
                </span>
                <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>
                  {new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {a.mountainRange && (
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>{a.mountainRange}</p>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {a.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.url}
                    alt=""
                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }}
                  />
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
