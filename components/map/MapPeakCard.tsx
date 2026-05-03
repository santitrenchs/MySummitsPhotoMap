"use client";

import type { MapPeak, AscentMapEntry } from "./MapView";
import { RARITY_COLORS } from "./MapView";

interface MapPeakCardProps {
  peak: MapPeak;
  ascent: AscentMapEntry | undefined;
  distanceKm: number | null;
  selected: boolean;
  onClick: () => void;
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export default function MapPeakCard({ peak, ascent, distanceKm, selected, onClick }: MapPeakCardProps) {
  const rarityColor = peak.rarityId ? (RARITY_COLORS[peak.rarityId] ?? "#6b7280") : "#6b7280";

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "10px 12px",
        background: selected ? "#f8fafc" : "white",
        border: "none",
        borderBottom: "1px solid #f3f4f6",
        borderLeft: `3px solid ${selected ? rarityColor : "transparent"}`,
        cursor: "pointer", textAlign: "left",
        transition: "background 0.12s",
      }}
    >
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 700, color: "#111827",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {peak.name}
          </p>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", flexShrink: 0 }}>
            {peak.altitudeM.toLocaleString()} m
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 2, minWidth: 0 }}>
          {peak.mountainRange ? (
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
              {peak.mountainRange}
            </p>
          ) : <span />}
          {peak.rarity && (
            <span style={{ fontSize: 11, fontWeight: 600, color: rarityColor, flexShrink: 0, whiteSpace: "nowrap" }}>
              ✿ {peak.rarity.name}
            </span>
          )}
        </div>

        {distanceKm !== null && (
          <span style={{ fontSize: 10, color: "#9ca3af", marginTop: 2, display: "block" }}>
            {formatDist(distanceKm)}
          </span>
        )}
      </div>
    </button>
  );
}
