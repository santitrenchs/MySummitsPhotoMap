"use client";

import { RARITIES } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";

type Props = {
  uniquePeaks: number;
  totalAscents: number;
  maxAltitudeM: number;
  rarityBreakdown: Record<string, number>;
  onRarityFilter: (rarityId: RarityId | null) => void;
  activeRarity: RarityId | null;
};

export function CimasStatsHeader({
  uniquePeaks, totalAscents, maxAltitudeM, rarityBreakdown, onRarityFilter, activeRarity,
}: Props) {
  const total = Object.values(rarityBreakdown).reduce((s, n) => s + n, 0);

  return (
    <div style={{ padding: "16px 16px 12px", background: "white", borderBottom: "1px solid #f3f4f6" }}>
      {/* ── Metrics row ── */}
      <div style={{ display: "flex", gap: 24, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f2233", lineHeight: 1 }}>
            {uniquePeaks}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3, fontWeight: 600 }}>
            cimas
          </div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f2233", lineHeight: 1 }}>
            {totalAscents}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3, fontWeight: 600 }}>
            ascensiones
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f2233", lineHeight: 1 }}>
            {maxAltitudeM > 0 ? `${maxAltitudeM} m` : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3, fontWeight: 600 }}>
            alt. máx
          </div>
        </div>
      </div>

      {/* ── Rarity bar ── */}
      {total > 0 && (
        <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 8, gap: 1 }}>
          {RARITIES.map((r) => {
            const count = rarityBreakdown[r.id] ?? 0;
            if (count === 0) return null;
            const pct = (count / total) * 100;
            const isActive = activeRarity === r.id;
            return (
              <button
                key={r.id}
                onClick={() => onRarityFilter(isActive ? null : r.id as RarityId)}
                title={`${r.label} (${count})`}
                style={{
                  flex: `0 0 ${pct}%`,
                  background: r.color,
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  opacity: activeRarity !== null && !isActive ? 0.35 : 1,
                  transition: "opacity 0.15s",
                  outline: isActive ? `2px solid ${r.colorDark}` : "none",
                  outlineOffset: 1,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
