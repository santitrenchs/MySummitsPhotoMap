import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
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
  // Friends' ascents can be in a different tenant, so we query globally (no tenantId filter).
  const ascent = await prisma.ascent.findFirst({
    where: { id },
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
          id: true, url: true, originalStorageKey: true, cropRotation: true,
          faceDetections: {
            select: {
              faceTags: {
                select: { userId: true, user: { select: { id: true, name: true, username: true } } },
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

  // Deduplicated tagged users from the hero photo, excluding the current user
  const personMap = new Map<string, { name: string }>();
  if (heroPhoto) {
    for (const fd of heroPhoto.faceDetections) {
      for (const tag of fd.faceTags) {
        if (tag.user && tag.userId !== session.user.id) {
          personMap.set(tag.userId!, { name: tag.user.username ?? tag.user.name });
        }
      }
    }
  }
  const persons = Array.from(personMap.entries())
    .map(([uid, p]) => ({ id: uid, name: p.name, email: null }));

  const currentUserName = user?.name ?? session.user.name ?? "";
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
      heroPhoto={heroPhoto ? { id: heroPhoto.id, url: heroPhoto.url, originalStorageKey: heroPhoto.originalStorageKey, cropRotation: heroPhoto.cropRotation } : null}
      persons={persons}
    />
  );
}
