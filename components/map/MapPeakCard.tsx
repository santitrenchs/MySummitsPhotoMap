"use client";

import type { MapPeak, AscentMapEntry } from "./MapView";
import { RARITY_COLORS } from "./MapView";
import { RARITIES } from "@/lib/rarity";
import { RarityFlower } from "@/components/brand/RarityFlowers";
import { peakDisplayParts } from "@/lib/peak-name";
import { formatAltitude, formatDistance } from "@/lib/units";
import { ChallengePatch } from "./ChallengePatch";
import type { PeakReto } from "./peak-challenges";
import { useUnitOpts } from "@/components/providers/I18nProvider";

interface MapPeakCardProps {
  peak: MapPeak;
  ascent: AscentMapEntry | undefined;
  distanceKm: number | null;
  selected: boolean;
  onClick: () => void;
  /** Retos this peak belongs to. Rendered as patches, left of the rarity pill. */
  retos?: PeakReto[];
}

/** Beyond this, the row shows the first two patches and a +N. */
const MAX_PATCHES = 3;

export default function MapPeakCard({ peak, ascent, distanceKm, selected, onClick, retos = [] }: MapPeakCardProps) {
  const u = useUnitOpts();
  const rarityColor = peak.rarityId ? (RARITY_COLORS[peak.rarityId] ?? "#6b7280") : "#6b7280";
  const rarityEntry = peak.rarityId ? RARITIES.find((r) => r.id === peak.rarityId) : null;
  const { primary: peakLabel, original: peakOriginal } = peakDisplayParts(peak);

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
            {peakLabel}
          </p>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", flexShrink: 0 }}>
            {formatAltitude(peak.altitudeM, u)}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 2, minWidth: 0 }}>
          {(peakOriginal ?? peak.mountainRange) ? (
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
              {peakOriginal ?? peak.mountainRange}
            </p>
          ) : <span />}
          {/* Retos + rarity, grouped and pinned right. The patches sit to the LEFT of
              the rarity pill on purpose: the pill then keeps the same position on every
              row, with retos or without, so the column can be read straight down.
              The patches are inert — the row is already the button that selects the
              peak, and an 18px target inside it would steal its tap. */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {retos.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                {retos.slice(0, retos.length > MAX_PATCHES ? 2 : MAX_PATCHES).map((r, idx) => (
                  <span key={r.id} style={{ marginLeft: idx === 0 ? 0 : -6, display: "flex" }}>
                    <ChallengePatch name={r.name} coverUrl={r.coverUrl} size={18} />
                  </span>
                ))}
                {retos.length > MAX_PATCHES && (
                  <span style={{
                    marginLeft: 3,
                    fontFamily: "var(--font-mono-landing, monospace)",
                    fontSize: 10, fontWeight: 700, color: "#9ca3af",
                  }}>
                    +{retos.length - 2}
                  </span>
                )}
              </div>
            )}
            {peak.rarity && rarityEntry && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                padding: "2px 7px", borderRadius: "var(--radius-full)",
                background: rarityColor + "22", flexShrink: 0,
              }}>
                <RarityFlower id={rarityEntry.id} size={10} />
                <span style={{ fontSize: 10, fontWeight: 700, color: rarityEntry.colorDark, whiteSpace: "nowrap" }}>
                  {peak.rarity.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {distanceKm !== null && (
          <span style={{ fontSize: 10, color: "#9ca3af", marginTop: 2, display: "block" }}>
            {formatDistance(distanceKm, u)}
          </span>
        )}
      </div>
    </button>
  );
}
