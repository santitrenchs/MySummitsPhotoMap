"use client";

import { useEffect, useState } from "react";
import type { ElevationProfile as ElevationProfileData } from "@/lib/services/elevation.service";

type Props = {
  peakId: string;
  altitudeM: number;
  rarityColor: string;
  /** Pre-loaded profile (e.g. from v1 API). Skips the fetch if provided. */
  profile?: ElevationProfileData | null;
};

export function ElevationProfile({ peakId, altitudeM, rarityColor, profile: initialProfile }: Props) {
  const [profile, setProfile] = useState<ElevationProfileData | null>(initialProfile ?? null);
  const [loading, setLoading] = useState(!initialProfile);

  useEffect(() => {
    if (initialProfile || profile) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/peaks/${peakId}/elevation`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled && data?.profile) setProfile(data.profile);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [peakId, initialProfile, profile]);

  if (loading) {
    return <ElevationSkeleton rarityColor={rarityColor} />;
  }

  if (!profile) {
    return <ElevationFallbackBar altitudeM={altitudeM} rarityColor={rarityColor} />;
  }

  return <ElevationSVG profile={profile} rarityColor={rarityColor} altitudeM={altitudeM} />;
}

// ─── SVG rendering ────────────────────────────────────────────────────────────

const W = 280;
const H = 60;
const PAD_X = 4;
const PAD_Y = 8;

function ElevationSVG({
  profile,
  rarityColor,
  altitudeM,
}: {
  profile: ElevationProfileData;
  rarityColor: string;
  altitudeM: number;
}) {
  const { points, minElevation, maxElevation, summitIndex } = profile;
  const range = maxElevation - minElevation || 1;

  const toX = (i: number) =>
    PAD_X + ((i / (points.length - 1)) * (W - PAD_X * 2));
  const toY = (elev: number) =>
    PAD_Y + ((1 - (elev - minElevation) / range) * (H - PAD_Y * 2));

  // Build SVG path
  const linePts = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.elevation).toFixed(1)}`);
  const areaPath =
    `M${toX(0).toFixed(1)},${H} ` +
    `L${linePts.join(" L")} ` +
    `L${toX(points.length - 1).toFixed(1)},${H} Z`;
  const linePath = `M${linePts.join(" L")}`;

  const summitX = toX(summitIndex);
  const summitY = toY(points[summitIndex]?.elevation ?? altitudeM);
  const gradId = `ep-${peakId(rarityColor)}`;

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.35" />
            <stop offset="100%" stopColor="white" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Line */}
        <path d={linePath} fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Distance labels */}
        <text x={PAD_X} y={H - 1} fontSize="7" fill="rgba(255,255,255,0.45)" style={{ fontFamily: "system-ui, sans-serif" }}>
          −8 km
        </text>
        <text x={W - PAD_X} y={H - 1} fontSize="7" fill="rgba(255,255,255,0.45)" textAnchor="end" style={{ fontFamily: "system-ui, sans-serif" }}>
          +8 km
        </text>
      </svg>
    </div>
  );
}

// Stable gradient ID from color
function peakId(color: string) {
  return color.replace("#", "");
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ElevationSkeleton({ rarityColor }: { rarityColor: string }) {
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        <rect x={PAD_X} y={PAD_Y} width={W - PAD_X * 2} height={H - PAD_Y * 2}
          rx="3" fill={rarityColor} fillOpacity="0.1" />
        <rect x={PAD_X} y={H / 2} width={(W - PAD_X * 2) * 0.4} height="2"
          rx="1" fill={rarityColor} fillOpacity="0.25" />
      </svg>
    </div>
  );
}

// ─── Fallback: simple altitude bar (when profile unavailable) ─────────────────

function ElevationFallbackBar({ altitudeM, rarityColor }: { altitudeM: number; rarityColor: string }) {
  const pct = Math.min(100, (altitudeM / 8849) * 100).toFixed(1);
  return (
    <div style={{ padding: "6px 0 4px" }}>
      <div style={{
        height: 6, borderRadius: 3,
        background: "rgba(255,255,255,0.15)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(to right, ${rarityColor}88, ${rarityColor})`,
        }} />
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: 9, color: "rgba(255,255,255,0.45)", marginTop: 2,
      }}>
        <span>0 m</span><span>8.849 m</span>
      </div>
    </div>
  );
}
