"use client";

import { useState } from "react";
import Link from "next/link";
import { RARITY_COLORS } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { RarityFlower } from "@/components/brand/RarityFlowers";
import { useT } from "@/components/providers/I18nProvider";
import { PeakFiltersBar } from "./PeakFiltersBar";
import { PhotoFiltersPanel } from "./PhotoFiltersPanel";
import { usePhotoFilters } from "./usePhotoFilters";
import type { PhotoForFilter } from "./usePhotoFilters";

type Props = {
  photos: PhotoForFilter[];
  isTagged?: boolean;
};

export function PhotosTabV2({ photos, isTagged = false }: Props) {
  const t = useT();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { query, setQuery, tier, setTier, sort, setSort, filtered, hasActiveFilters, activeFilterCount, clearAll } = usePhotoFilters(photos);

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 16px", color: "#9ca3af", fontSize: 14 }}>—</div>
    );
  }

  const placeholder = isTagged ? t.profile_photos_searchTaggedPlaceholder : t.profile_photos_searchPlaceholder;

  return (
    <div style={{ background: "#F4F7FA", margin: "0 -16px", padding: "0 16px" }}>

      {/* Sticky filter bar — reuses same component as Cimas, no range */}
      <div style={{
        position: "sticky",
        top: "calc(var(--top-nav-h, 52px) + 44px)",
        zIndex: 20,
        background: "#F4F7FA",
        padding: "12px 0 0",
        margin: "0 -16px",
      }}>
        <PeakFiltersBar
          query={query} setQuery={setQuery}
          tier={tier} setTier={setTier}
          range={null} setRange={() => {}}
          sort={sort as never}
          filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          searchPlaceholder={placeholder}
        />
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <PhotoFiltersPanel
          photos={photos}
          filteredCount={filtered.length}
          tier={tier} setTier={setTier}
          sort={sort} setSort={setSort}
          clearAll={clearAll}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "8px 0 32px" }}>
        {filtered.map((p) => (
          <PhotoTile key={p.id} photo={p} isTagged={isTagged} dateLocale={t.dateLocale} />
        ))}
      </div>
    </div>
  );
}

function PhotoTile({ photo, isTagged, dateLocale }: { photo: PhotoForFilter; isTagged: boolean; dateLocale: string }) {
  const [imgError, setImgError] = useState(false);
  const color = RARITY_COLORS[photo.rarityId] ?? "#94A3B8";
  const dateStr = new Date(photo.date).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "2-digit" });

  return (
    <Link href={`/ascents?highlight=${photo.ascentId}`} style={{ textDecoration: "none" }}>
      <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden", background: imgError ? "#E8EFF6" : "#0D2538", borderRadius: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {!imgError && <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImgError(true)} />}
        {imgError && (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏔</div>
        )}

        {/* Top-left: rarity flower */}
        <div style={{ position: "absolute", top: 5, left: 5, width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RarityFlower id={photo.rarityId} size={14} />
        </div>

        {/* Top-right: tagged-by badge */}
        {isTagged && photo.creatorName && (
          <div style={{ position: "absolute", top: 5, right: 5, background: "rgba(13,37,56,0.78)", backdropFilter: "blur(4px)", borderRadius: 999, padding: "2px 6px" }}>
            <span style={{ fontFamily: "var(--font-mono-landing, monospace)", fontSize: 8, fontWeight: 700, color: "white", whiteSpace: "nowrap" }}>
              @{photo.creatorName}
            </span>
          </div>
        )}

        {/* Bottom overlay */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(13,37,56,0.75) 0%, transparent 100%)", padding: "16px 6px 5px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "white", fontFamily: "var(--font-space-grotesk, sans-serif)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2, marginBottom: 2 }}>
            {photo.peakName}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono-landing, monospace)", fontSize: 8, fontWeight: 700, color }}>{photo.altitudeM}</span>
            <span style={{ fontFamily: "var(--font-mono-landing, monospace)", fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{dateStr}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
