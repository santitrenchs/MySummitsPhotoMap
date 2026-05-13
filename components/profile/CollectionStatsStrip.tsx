"use client";

import { RARITIES } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { useT } from "@/components/providers/I18nProvider";

type Props = {
  uniquePeaks: number;
  totalAscents: number;
  rarityIds: RarityId[];
};

export function CollectionStatsStrip({ uniquePeaks, totalAscents, rarityIds }: Props) {
  const t = useT();
  const uniqueRarities = new Set(rarityIds).size;
  const totalRarities = RARITIES.length;

  return (
    <div style={{ padding: "14px 16px 14px" }}>
      <div style={{
        fontFamily: "var(--font-mono-landing, monospace)",
        fontSize: 9, fontWeight: 700, letterSpacing: "0.20em",
        color: "#94A3B8",
        textTransform: "uppercase",
        marginBottom: 6,
      }}>
        {t.profile_collection_title}
      </div>
      <div style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
        <StatItem value={uniquePeaks} label={t.profile_collection_unique} />
        <StatItem value={totalAscents} label={t.profile_collection_ascents} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
          <span style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 22, fontWeight: 700, color: "#0D2538",
            letterSpacing: "-0.025em",
          }}>
            {uniqueRarities}/{totalRarities}
          </span>
          <span style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: 12, fontWeight: 500,
            color: "#5A6E84",
            marginLeft: 5,
          }}>
            {t.profile_collection_rarities}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
      <span style={{
        fontFamily: "var(--font-space-grotesk, sans-serif)",
        fontSize: 22, fontWeight: 700, color: "#0D2538",
        letterSpacing: "-0.025em",
      }}>
        {value}
      </span>
      <span style={{
        fontFamily: "var(--font-inter, sans-serif)",
        fontSize: 12, fontWeight: 500,
        color: "#5A6E84",
        marginLeft: 5,
      }}>
        {label}
      </span>
    </div>
  );
}
