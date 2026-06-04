import { prisma } from "@/lib/db/client";

const NEARBY_RADIUS_DEGREES = 0.8;
const MAX_NEARBY_PEAKS = 5;

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

export async function ensureNearbyPeaksForPeak(peakId: string): Promise<NearbyPeakSnapshot[]> {
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
  if (Array.isArray(peak.nearbyPeaks)) return peak.nearbyPeaks as NearbyPeakSnapshot[];

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

  const nearby = candidates
    .map((candidate) => ({
      ...candidate,
      distanceM: haversineM(peak.latitude, peak.longitude, candidate.latitude, candidate.longitude),
    }))
    .sort((a, b) => a.distanceM - b.distanceM)
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
