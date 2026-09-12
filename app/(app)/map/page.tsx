import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getAscentMapData } from "@/lib/services/ascent.service";
import { getChallengeMapPeaks } from "@/lib/services/challenge.service";
import { getLocale } from "@/lib/i18n/server";
import MapContainer from "@/components/map/MapContainer";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // "Challenge mode": the Atlas is scoped to one reto's peaks and nothing else.
  // Resolved server-side (and scoped to the session user) so the first paint already
  // has the peaks to frame — there is no client fetch to wait for.
  const { challenge: challengeId } = await searchParams;
  const challenge = challengeId
    ? await getChallengeMapPeaks(challengeId, session.user.id, await getLocale())
    : null;

  const [ascentData, rarities, userPrefs] = await Promise.all([
    getAscentMapData(session.user.tenantId),
    prisma.rarity.findMany({ orderBy: { order: "asc" } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { mapOnboardingSeen: true } }).catch(() => null),
  ]);

  // Only fetch the user's climbed peaks — unclimbed peaks load client-side per viewport
  const climbedPeakIds = ascentData.map((a) => a.peakId);
  const climbedPeaks = climbedPeakIds.length > 0
    ? await prisma.peak.findMany({
        where: { id: { in: climbedPeakIds } },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          altitudeM: true,
          mountainRange: true,
          country: true,
          rarityId: true,
          isMythic: true,
          rarity: { select: { id: true, name: true, emoji: true, order: true } },
        },
      })
    : [];

  return (
    <MapContainer
      peaks={climbedPeaks}
      ascentData={ascentData}
      rarities={rarities}
      showOnboarding={!userPrefs?.mapOnboardingSeen && !challenge}
      challengeId={challenge?.id ?? null}
      challengeName={challenge?.name ?? null}
      challengePeaks={challenge?.peaks ?? null}
    />
  );
}
