"use client";

import { useState } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { CimasStatsHeader } from "./CimasStatsHeader";
import { PeaksTabV2 } from "@/components/profile/PeaksTabV2";
import { PhotosTabV2 } from "@/components/profile/PhotosTabV2";
import type { RarityId } from "@/lib/rarity";
import type { PeakForFilter } from "@/components/profile/usePeakFilters";

type Photo = {
  id: string;
  url: string;
  ascentId: string;
  peakName: string;
  altitudeM: number;
  rarityId: RarityId;
  date: Date;
  creatorName?: string;
};

type Stats = {
  totalAscents: number;
  uniquePeaks: number;
  maxAltitudeM: number;
  rarityBreakdown: Record<string, number>;
};

type Props = {
  peaks: PeakForFilter[];
  photos: Photo[];
  taggedPhotos: Photo[];
  stats: Stats;
};

type Tab = "peaks" | "photos" | "tagged";

export function BitacoraClient({ peaks, photos, taggedPhotos, stats }: Props) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("peaks");
  const [activeRarity, setActiveRarity] = useState<RarityId | null>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: "peaks",  label: t.profile_tab_peaks },
    { id: "photos", label: t.field_photos },
    { id: "tagged", label: t.profile_tab_tagged },
  ];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 32 }}>
      {/* ── Stats header (Cimas tab only) ── */}
      {tab === "peaks" && (
        <CimasStatsHeader
          uniquePeaks={stats.uniquePeaks}
          totalAscents={stats.totalAscents}
          maxAltitudeM={stats.maxAltitudeM}
          rarityBreakdown={stats.rarityBreakdown}
          activeRarity={activeRarity}
          onRarityFilter={(r) => setActiveRarity(r)}
        />
      )}

      {/* ── Tab bar ── */}
      <div style={{
        display: "flex", borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: "var(--top-nav-h, 48px)", zIndex: 10,
        background: "white",
      }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, padding: "12px 4px",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              color: tab === id ? "#0369a1" : "#6b7280",
              borderBottom: tab === id ? "2px solid #0369a1" : "2px solid transparent",
              transition: "color 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: "0 16px" }}>
        {tab === "peaks" && (
          <PeaksTabV2 peaks={peaks} initialTier={activeRarity} />
        )}
        {tab === "photos" && (
          <PhotosTabV2 photos={photos} />
        )}
        {tab === "tagged" && (
          <PhotosTabV2 photos={taggedPhotos} isTagged />
        )}
      </div>
    </div>
  );
}
