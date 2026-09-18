"use client";
import { formatAltitude } from "@/lib/units";

import type { RarityId } from "@/lib/rarity";
import { useUnitOpts } from "@/components/providers/I18nProvider";

type Props = {
  uniquePeaks: number;
  totalAscents: number;
  maxAltitudeM: number;
  rarityBreakdown: Record<string, number>;
  onRarityFilter: (rarityId: RarityId | null) => void;
  activeRarity: RarityId | null;
};

export function CimasStatsHeader({
  uniquePeaks, totalAscents, maxAltitudeM,
}: Props) {
  const u = useUnitOpts();
  return (
    <div style={{ padding: "16px 16px 12px", background: "white", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", gap: 24 }}>
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
            {maxAltitudeM > 0 ? formatAltitude(maxAltitudeM, u) : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3, fontWeight: 600 }}>
            alt. máx
          </div>
        </div>
      </div>
    </div>
  );
}
