import { prisma } from "@/lib/db/client";

const NEARBY_RADIUS_DEGREES = 0.8;
const RELEVANT_RADIUS_M = 20_000;
const MAX_NEARBY_PEAKS = 5;
const RARITY_WEIGHT: Record<string, number> = {
  daisy: 1,
  heather: 2,
  gentian: 3,
  tundra: 4,
  edelweiss: 5,
  draba: 6,
  saxifrage: 7,
  cinquefoil: 8,
  snow_lotus: 9,
  lavender: 3,
};

type PeakForNearby = {
  id: string;
  name: string;
  nameEn: string | null;
  latitude: number;
  longitude: number;
  altitudeM: number;
  rarityId: string | null;
};

export type NearbyPeakSnapshot = PeakForNearby & {
  distanceM: number;
};

function haversineM(latA: number, lonA: number, latB: number, lonB: number): number {
  const earthRadiusM = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(latB - latA);
  const dLon = toRad(lonB - lonA);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function nearbyRelevanceScore(peak: NearbyPeakSnapshot): number {
  const rarityBonus = peak.rarityId ? (RARITY_WEIGHT[peak.rarityId] ?? 0) * 50 : 0;
  return peak.altitudeM + rarityBonus - peak.distanceM / 100;
}

export async function ensureNearbyPeaksForPeak(
  peakId: string,
  options: { force?: boolean } = {},
): Promise<NearbyPeakSnapshot[]> {
  const peak = await prisma.peak.findUnique({
    where: { id: peakId },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      nearbyPeaks: true,
    },
  });

  if (!peak) return [];
  if (!options.force && Array.isArray(peak.nearbyPeaks)) return peak.nearbyPeaks as NearbyPeakSnapshot[];

  const candidates = await prisma.peak.findMany({
    where: {
      id: { not: peak.id },
      latitude: { gte: peak.latitude - NEARBY_RADIUS_DEGREES, lte: peak.latitude + NEARBY_RADIUS_DEGREES },
      longitude: { gte: peak.longitude - NEARBY_RADIUS_DEGREES, lte: peak.longitude + NEARBY_RADIUS_DEGREES },
    },
    select: {
      id: true,
      name: true,
      nameEn: true,
      latitude: true,
      longitude: true,
      altitudeM: true,
      rarityId: true,
    },
  });

  const scoredCandidates = candidates
    .map((candidate) => ({
      ...candidate,
      distanceM: haversineM(peak.latitude, peak.longitude, candidate.latitude, candidate.longitude),
    }));
  const relevantCandidates = scoredCandidates.filter((candidate) => candidate.distanceM <= RELEVANT_RADIUS_M);
  const nearby = (relevantCandidates.length >= MAX_NEARBY_PEAKS ? relevantCandidates : scoredCandidates)
    .sort((a, b) => nearbyRelevanceScore(b) - nearbyRelevanceScore(a) || a.distanceM - b.distanceM)
    .slice(0, MAX_NEARBY_PEAKS);

  await prisma.peak.update({
    where: { id: peak.id },
    data: {
      nearbyPeaks: nearby,
      nearbyPeaksUpdatedAt: new Date(),
    },
  });

  return nearby;
}
