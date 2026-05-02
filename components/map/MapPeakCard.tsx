"use client";

import type { MapPeak, AscentMapEntry } from "./MapView";
import { RARITY_COLORS } from "./MapView";

interface MapPeakCardProps {
  peak: MapPeak;
  ascent: AscentMapEntry | undefined;
  distanceKm: number | null;
  selected: boolean;
  onClick: () => void;
  // Expanded detail mode
  expanded?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  actionVariant?: "dark" | "blue";
}

export default function MapPeakCard({
  peak, ascent, distanceKm, selected, onClick,
  expanded, onAction, actionLabel, actionVariant = "dark",
}: MapPeakCardProps) {
  const rarityColor = peak.rarityId ? (RARITY_COLORS[peak.rarityId] ?? "#6b7280") : "#6b7280";

  return (
    <div style={{
      background: expanded ? "#f8fafc" : selected ? "#f0f9ff" : "white",
      borderBottom: "1px solid #f3f4f6",
      borderLeft: expanded ? `3px solid ${rarityColor}` : "3px solid transparent",
      transition: "background 0.12s",
    }}>
      {/* Card row — always a clickable button */}
      <button
        onClick={onClick}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          width: "100%", padding: "12px 14px",
          background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        {/* Thumbnail */}
        {ascent && (
          <div style={{
            width: 60, height: 60, borderRadius: 10, flexShrink: 0,
            overflow: "hidden", position: "relative",
            border: `2px solid ${(selected || expanded) ? rarityColor : "#e5e7eb"}`,
          }}>
            {ascent.photoUrl ? (
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
                background: `linear-gradient(135deg, ${rarityColor}22 0%, ${rarityColor}44 100%)`,
              }}>
                {peak.rarity?.emoji ?? "🏔"}
              </span>
            )}
          </div>
        )}

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
            </p>
          )}
          {peak.rarity && (
            <span className={`capture-rarity-inline ${peak.rarityId ?? ""}`} style={{ marginTop: 3 }}>
              <span className="rarity-icon" style={{ background: "none" }}>✿</span>
              <span className="rarity-value">{peak.rarity.name}</span>
            </span>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            {ascent && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#16a34a",
                background: "#dcfce7", borderRadius: 20, padding: "2px 7px",
              }}>✓ Capturada</span>
            )}
            {distanceKm !== null && (
              <span style={{ fontSize: 10, color: "#9ca3af" }}>
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div style={{ padding: "0 14px 14px" }}>
          {/* Hero photo */}
          {ascent?.photoUrl && (
            <div style={{
              aspectRatio: "3/2", borderRadius: 10, overflow: "hidden",
              marginBottom: 10, flexShrink: 0,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ascent.photoUrl}
                alt=""
                style={{
                  width: "100%", height: "100%", objectFit: "cover", display: "block",
                  objectPosition: (() => {
                    const cx = ascent.faceCenterX;
                    const cy = ascent.faceCenterY;
                    if (cx == null || cy == null) return "50% 20%";
                    const r = 1.875;
                    const py = Math.max(0, Math.min(1, (0.38 - cy * r) / (1 - r)));
                    return `${cx * 100}% ${py * 100}%`;
                  })(),
                }}
              />
            </div>
          )}

          {/* Action button */}
          {onAction && actionLabel && (
            <button
              onClick={(e) => { e.stopPropagation(); onAction(); }}
              style={{
                width: "100%", padding: "11px",
                background: actionVariant === "blue" ? "#0369a1" : "#111827",
                color: "white", border: "none", borderRadius: 10,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
