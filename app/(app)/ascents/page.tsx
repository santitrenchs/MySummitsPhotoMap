import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { listAscents } from "@/lib/services/ascent.service";
import { AscentsClient } from "@/components/ascents/AscentsClient";
import { getServerT } from "@/lib/i18n/server";
import { prisma } from "@/lib/db/client";

const PHOTOS_INCLUDE = {
  orderBy: { createdAt: "asc" as const },
  select: {
    id: true,
    url: true,
    faceDetections: {
      select: {
        faceTags: {
          select: { person: { select: { id: true, name: true, email: true } } },
        },
      },
    },
  },
} as const;

function enrichAscent(
  a: {
    id: string;
    date: Date;
    route: string | null;
    description: string | null;
    peak: { id: string; name: string; altitudeM: number; mountainRange: string | null; latitude: number; longitude: number };
    photos: { id: string; url: string; faceDetections: { faceTags: { person: { id: string; name: string; email: string | null } }[] }[] }[];
  },
  isOwn: boolean,
  userName: string,
) {
  const firstPhoto = a.photos[0] ?? null;
  const personMap = new Map<string, { id: string; name: string; email: string | null }>();
  for (const photo of a.photos) {
    for (const fd of photo.faceDetections) {
      for (const tag of fd.faceTags) {
        personMap.set(tag.person.id, { id: tag.person.id, name: tag.person.name, email: tag.person.email ?? null });
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
    isOwn,
    userName,
  };
}

export default async function AscentsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const t = await getServerT();

  // Fetch own ascents + accepted friends in parallel
  const [raw, friendships] = await Promise.all([
    listAscents(session.user.tenantId),
    prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: session.user.id }, { addresseeId: session.user.id }] },
      select: { requesterId: true, addresseeId: true },
    }),
  ]);

  const friendUserIds = friendships.map((f) =>
    f.requesterId === session.user.id ? f.addresseeId : f.requesterId
  );

  const friendsRaw = friendUserIds.length > 0
    ? await prisma.ascent.findMany({
        where: { tenantId: session.user.tenantId, createdBy: { in: friendUserIds } },
        orderBy: { date: "desc" },
        include: {
          peak: { select: { id: true, name: true, altitudeM: true, mountainRange: true, latitude: true, longitude: true } },
          photos: PHOTOS_INCLUDE,
          user: { select: { name: true } },
        },
      })
    : [];

  const myAscents = raw
    .filter((a) => a.createdBy === session.user.id)
    .map((a) => enrichAscent(a, true, session.user.name ?? ""));
  const friendAscents = friendsRaw.map((a) => enrichAscent(a as Parameters<typeof enrichAscent>[0], false, (a.user as { name?: string | null } | null)?.name ?? "?"));

  // Merge and sort by date desc
  const ascents = [...myAscents, ...friendAscents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>{t.nav_ascents}</h1>
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
