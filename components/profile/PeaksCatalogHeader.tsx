"use client";

import { RARITIES, RARITY_COLORS } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { useT } from "@/components/providers/I18nProvider";
import type { PeakForFilter } from "./usePeakFilters";

type Props = {
  peaks: PeakForFilter[];
  tier: RarityId | null;
  setTier: (v: RarityId | null) => void;
};

export function PeaksCatalogHeader({ peaks, tier, setTier }: Props) {
  const t = useT();
  const totalAscents = peaks.reduce((s, p) => s + p.count, 0);
  const maxAlt = peaks.length > 0 ? Math.max(...peaks.map((p) => p.altitudeM)) : 0;

  // Count peaks per rarity (only tiers present)
  const rarityCounts: Partial<Record<RarityId, number>> = {};
  for (const p of peaks) {
    rarityCounts[p.rarityId] = (rarityCounts[p.rarityId] ?? 0) + 1;
  }
  const presentRarities = RARITIES.filter((r) => (rarityCounts[r.id as RarityId] ?? 0) > 0);

  // Bar segments: proportional width per tier
  const barSegments = presentRarities.map((r) => ({
    id: r.id as RarityId,
    color: r.color,
    pct: ((rarityCounts[r.id as RarityId] ?? 0) / peaks.length) * 100,
  }));

  return (
    <div style={{ padding: "16px 16px 12px" }}>
      {/* Stats row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        {/* Left */}
        <div>
          <div style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            color: "#94A3B8", textTransform: "uppercase", marginBottom: 4,
          }}>
            {t.profile_catalog_label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: 28, fontWeight: 800, color: "#0D2538",
              letterSpacing: "-0.025em", lineHeight: 1,
            }}>
              {peaks.length}
            </span>
            <span style={{
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: 14, fontWeight: 500, color: "#5A6E84",
            }}>
              {t.profile_catalog_peaks} · <strong style={{ color: "#0D2538", fontWeight: 700 }}>{totalAscents}</strong> {t.profile_catalog_ascents}
            </span>
          </div>
        </div>

        {/* Right */}
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            color: "#94A3B8", textTransform: "uppercase", marginBottom: 4,
          }}>
            {t.profile_catalog_highest}
          </div>
          <div style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 20, fontWeight: 800, color: "#0D2538",
            letterSpacing: "-0.025em", lineHeight: 1,
          }}>
            {maxAlt} m
          </div>
        </div>
      </div>

      {/* Rarity distribution bar */}
      {barSegments.length > 0 && (
        <div style={{
          display: "flex", height: 8, borderRadius: 999,
          overflow: "hidden", marginBottom: 14, gap: 2,
        }}>
          {barSegments.map((seg) => (
            <div
              key={seg.id}
              style={{
                flex: seg.pct,
                background: seg.color,
                borderRadius: 999,
                cursor: "pointer",
                opacity: tier && tier !== seg.id ? 0.35 : 1,
                transition: "opacity 0.15s",
              }}
              onClick={() => setTier(tier === seg.id ? null : seg.id)}
            />
          ))}
        </div>
      )}

    </div>
  );
}
