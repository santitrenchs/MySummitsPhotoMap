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

export default function MapPeakCard({ peak, ascent, distanceKm, selected, onClick }: MapPeakCardProps) {
  const rarityColor = peak.rarityId ? (RARITY_COLORS[peak.rarityId] ?? "#6b7280") : "#6b7280";

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        width: "100%", padding: "12px 14px",
        background: selected ? "#f0f9ff" : "white",
        border: "none", borderBottom: "1px solid #f3f4f6",
        cursor: "pointer", textAlign: "left",
        transition: "background 0.12s",
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: 60, height: 60, borderRadius: 10, flexShrink: 0,
        overflow: "hidden", position: "relative",
        background: ascent?.photoUrl
          ? undefined
          : `linear-gradient(135deg, ${rarityColor}22 0%, ${rarityColor}44 100%)`,
        border: selected ? `2px solid ${rarityColor}` : "2px solid #e5e7eb",
      }}>
        {ascent?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ascent.photoUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <span style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: peak.rarity ? 22 : 18,
          }}>
            {peak.rarity?.emoji ?? "🏔"}
          </span>
        )}
      </div>

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

        {peak.mountainRange && (
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {peak.mountainRange}
            {peak.rarity && (
              <span style={{ marginLeft: 5, color: rarityColor, fontWeight: 600 }}>
                · {peak.rarity.emoji} {peak.rarity.name}
              </span>
            )}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          {ascent ? (
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#16a34a",
              background: "#dcfce7", borderRadius: 20, padding: "2px 7px",
            }}>✓ Escalada</span>
          ) : (
            <span style={{
              fontSize: 10, fontWeight: 600, color: "#6b7280",
              background: "#f3f4f6", borderRadius: 20, padding: "2px 7px",
            }}>Por conquistar</span>
          )}
          {distanceKm !== null && (
            <span style={{ fontSize: 10, color: "#9ca3af" }}>
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
