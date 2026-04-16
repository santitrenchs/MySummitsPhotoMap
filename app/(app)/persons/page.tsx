import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listPersonsWithStats } from "@/lib/services/person.service";
import { PersonsClient, type PersonCard } from "@/components/persons/PersonsClient";
import { getServerT } from "@/lib/i18n/server";

export default async function PersonsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const t = await getServerT();

  const raw = await listPersonsWithStats(session.user.tenantId);

  const persons: PersonCard[] = raw.map((person) => {
    // Deduplicate ascents
    const ascentMap = new Map<string, { id: string; peakName: string; altitudeM: number; photoUrl: string; date: string }>();
    for (const tag of person.faceTags) {
      const photo = tag.faceDetection.photo;
      const ascent = photo.ascent;
      if (!ascentMap.has(ascent.id)) {
        ascentMap.set(ascent.id, {
          id: ascent.id,
          peakName: ascent.peak.name,
          altitudeM: ascent.peak.altitudeM,
          photoUrl: photo.url,
          date: ascent.date.toISOString(),
        });
      }
    }
    const ascents = Array.from(ascentMap.values());
    const highestPeak = ascents.reduce<{ name: string; altitudeM: number } | null>(
      (best, a) => (!best || a.altitudeM > best.altitudeM ? { name: a.peakName, altitudeM: a.altitudeM } : best),
      null
    );
    const lastAscentDate = ascents.length
      ? ascents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
      : null;

    // Avatar: use most recent face tag's photo + bounding box
    const firstTag = person.faceTags[0] ?? null;
    const avatarFaceBox = firstTag
      ? (firstTag.faceDetection.boundingBox as { x: number; y: number; width: number; height: number } | null)
      : null;

    return {
      id: person.id,
      name: person.name,
      email: person.email ?? null,
      userId: person.userId ?? null,
      photoCount: person.faceTags.length,
      ascentCount: ascents.length,
      highestPeak,
      lastAscentDate,
      lastTaggedAt: firstTag ? firstTag.createdAt.toISOString() : null,
      avatarPhotoUrl: firstTag?.faceDetection.photo.url ?? null,
      avatarFaceBox,
      ascents: Array.from(ascentMap.values()),
    };
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>{t.people_title}</h1>
      </div>

      {persons.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 0",
          border: "1px dashed #e5e7eb", borderRadius: 12,
        }}>
          <p style={{ fontSize: 32, margin: "0 0 8px" }}>👥</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", margin: 0 }}>{t.people_noMatch}</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0" }}>{t.people_emptyHint}</p>
        </div>
      ) : (
        <PersonsClient persons={persons} />
      )}
    </div>
  );
}
