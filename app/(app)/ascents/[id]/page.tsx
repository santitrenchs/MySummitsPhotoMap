import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { getServerT } from "@/lib/i18n/server";
import { AscentDetailClient } from "@/components/ascents/AscentDetailClient";
import { prisma } from "@/lib/db/client";

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
      peak: {
        select: {
          name: true, altitudeM: true, mountainRange: true,
          latitude: true, longitude: true,
        },
      },
      photos: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true, url: true,
          faceDetections: {
            select: {
              faceTags: {
                select: { person: { select: { id: true, name: true, email: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!ascent) notFound();

  // Fetch the user's display name
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  const t = await getServerT();

  // ── Derived data ──────────────────────────────────────────────────────────
  const heroPhoto = ascent.photos[0] ?? null;

  // Deduplicated persons from the photo, excluding the current user
  const personMap = new Map<string, { name: string; email: string | null }>();
  if (heroPhoto) {
    for (const fd of heroPhoto.faceDetections) {
      for (const tag of fd.faceTags) {
        personMap.set(tag.person.id, { name: tag.person.name, email: tag.person.email });
      }
    }
  }
  const currentUserName = user?.name ?? session.user.name ?? "";
  const persons = Array.from(personMap.entries())
    .map(([pid, p]) => ({ id: pid, ...p }))
    .filter(p =>
      (session.user.email ? p.email !== session.user.email : true) &&
      (currentUserName ? p.name !== currentUserName : true)
    );

  const dateStr = new Date(ascent.date).toLocaleDateString(t.dateLocale, {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <AscentDetailClient
      id={id}
      ascentId={id}
      peakName={ascent.peak.name}
      peakAltitudeM={ascent.peak.altitudeM}
      peakMountainRange={ascent.peak.mountainRange}
      peakLatitude={ascent.peak.latitude}
      peakLongitude={ascent.peak.longitude}
      date={dateStr}
      dateLocale={t.dateLocale}
      rawDate={ascent.date.toISOString()}
      route={ascent.route}
      description={ascent.description}
      wikiloc={ascent.wikiloc}
      userName={currentUserName}
      heroPhoto={heroPhoto ? { id: heroPhoto.id, url: heroPhoto.url } : null}
      persons={persons}
    />
  );
}
