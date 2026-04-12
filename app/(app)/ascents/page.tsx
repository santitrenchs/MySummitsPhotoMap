import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { listAscents } from "@/lib/services/ascent.service";
import { AscentsClient } from "@/components/ascents/AscentsClient";
import { getServerT } from "@/lib/i18n/server";

export default async function AscentsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const t = await getServerT();

  const raw = await listAscents(session.user.tenantId);

  // Enrich: extract firstPhoto + deduplicated persons per ascent
  const ascents = raw.map((a) => {
    const firstPhoto = a.photos[0] ?? null;
    const personMap = new Map<string, { id: string; name: string }>();
    for (const photo of a.photos) {
      for (const fd of photo.faceDetections) {
        for (const tag of fd.faceTags) {
          personMap.set(tag.person.id, tag.person);
        }
      }
    }
    return {
      id: a.id,
      date: a.date.toISOString(),
      route: a.route,
      description: a.description,
      peak: a.peak,
      firstPhotoId: firstPhoto?.id ?? null,
      firstPhotoUrl: firstPhoto?.url ?? null,
      persons: Array.from(personMap.values()),
    };
  });

  // All unique persons across all ascents, sorted by name
  const allPersonsMap = new Map<string, { id: string; name: string }>();
  for (const a of ascents) {
    for (const p of a.persons) allPersonsMap.set(p.id, p);
  }
  const allPersons = Array.from(allPersonsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // All unique years, newest first
  const allYears = [...new Set(ascents.map((a) => new Date(a.date).getFullYear()))].sort((a, b) => b - a);

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>{t.ascents_title}</h1>
        <Link
          href="/ascents/new"
          style={{
            padding: "8px 16px", background: "#0369a1", color: "white",
            borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}
        >
          {t.ascents_newAscent}
        </Link>
      </div>

      {ascents.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 0",
          border: "1px dashed #e5e7eb", borderRadius: 12,
        }}>
          <p style={{ fontSize: 32, margin: "0 0 8px" }}>🏔</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", margin: 0 }}>{t.ascents_emptyTitle}</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 16px" }}>{t.ascents_emptySub}</p>
          <Link
            href="/ascents/new"
            style={{
              padding: "8px 16px", background: "#0369a1", color: "white",
              borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}
          >
            {t.nav_logAscent}
          </Link>
        </div>
      ) : (
        <Suspense>
          <AscentsClient ascents={ascents} allPersons={allPersons} allYears={allYears} currentUserEmail={session.user.email} currentUserName={session.user.name ?? ""} />
        </Suspense>
      )}
    </div>
  );
}
