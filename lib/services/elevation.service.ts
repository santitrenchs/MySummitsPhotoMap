export type ElevationPoint = {
  distance: number; // km from center, negative = south, positive = north
  elevation: number; // metres
};

export type ElevationProfile = {
  points: ElevationPoint[];
  minElevation: number;
  maxElevation: number;
  summitIndex: number; // index of the peak point (center)
};

const SAMPLE_COUNT = 60;
const RANGE_KM = 8; // ±8 km from the summit

function generateLatLonPoints(
  lat: number,
  lon: number
): { lat: number; lon: number; distanceKm: number }[] {
  const points = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    // linear interpolation from -RANGE_KM to +RANGE_KM
    const distanceKm = -RANGE_KM + (i / (SAMPLE_COUNT - 1)) * RANGE_KM * 2;
    // 1 degree latitude ≈ 111.32 km
    const offsetLat = distanceKm / 111.32;
    points.push({ lat: lat + offsetLat, lon, distanceKm });
  }
  return points;
}

export async function fetchElevationProfile(
  lat: number,
  lon: number
): Promise<ElevationProfile> {
  const pts = generateLatLonPoints(lat, lon);
  const locations = pts.map((p) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join("|");

  const res = await fetch(
    `https://api.opentopodata.org/v1/srtm30m?locations=${locations}`,
    {
      headers: { "User-Agent": "Peakadex/1.0 (noreply@peakadex.com)" },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!res.ok) {
    throw new Error(`OpenTopoData error: ${res.status}`);
  }

  const data = await res.json();
  const results: { elevation: number | null }[] = data.results ?? [];

  // Fallback: fill nulls with neighbours
  const elevations = results.map((r) => r.elevation ?? 0);
  for (let i = 0; i < elevations.length; i++) {
    if (elevations[i] === 0 && results[i].elevation === null) {
      elevations[i] =
        (elevations[i - 1] ?? elevations[i + 1] ?? 0);
    }
  }

  const summitIndex = Math.floor(SAMPLE_COUNT / 2);

  const points: ElevationPoint[] = pts.map((p, i) => ({
    distance: parseFloat(p.distanceKm.toFixed(2)),
    elevation: Math.round(elevations[i] ?? 0),
  }));

  return {
    points,
    minElevation: Math.min(...points.map((p) => p.elevation)),
    maxElevation: Math.max(...points.map((p) => p.elevation)),
    summitIndex,
  };
}
