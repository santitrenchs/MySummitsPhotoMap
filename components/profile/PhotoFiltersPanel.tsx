"use client";

import { RARITIES } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import type { PhotoSortId, PhotoForFilter } from "./usePhotoFilters";

const SORT_OPTIONS: { id: PhotoSortId; labelKey: "profile_sort_recent" | "profile_sort_altDesc" | "profile_sort_alpha" }[] = [
  { id: "recent",       labelKey: "profile_sort_recent" },
  { id: "altitude_desc",labelKey: "profile_sort_altDesc" },
  { id: "alpha",        labelKey: "profile_sort_alpha" },
];

type Props = {
  photos: PhotoForFilter[];
  filteredCount: number;
  tier: RarityId | null; setTier: (v: RarityId | null) => void;
  sort: PhotoSortId;     setSort: (v: PhotoSortId) => void;
  clearAll: () => void;
  onClose: () => void;
};

export function PhotoFiltersPanel({ photos, filteredCount, tier, setTier, sort, setSort, clearAll, onClose }: Props) {
  const t = useT();

  const rarityCounts: Record<string, number> = {};
  for (const p of photos) rarityCounts[p.rarityId] = (rarityCounts[p.rarityId] ?? 0) + 1;

  const hasFilters = tier !== null || sort !== "recent";

  return (
    <div style={{
      background: "white", borderRadius: 16,
      border: "1px solid #E5E7EB",
      boxShadow: "0 4px 24px rgba(13,37,56,0.08)",
      overflow: "hidden", margin: "0 0 12px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #F1F5F9" }}>
        <span style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", fontSize: 14, fontWeight: 700, color: "#0D2538", letterSpacing: "-0.01em" }}>
          {t.profile_filter_title}
        </span>
        <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: "50%", background: "#F1F5F9", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#5A6E84" strokeWidth="2.6" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>

      {/* Rarity */}
      <div style={{ padding: "14px 14px 4px" }}>
        <div style={{ fontFamily: "var(--font-inter, sans-serif)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#94A3B8", textTransform: "uppercase", marginBottom: 6 }}>
          {t.profile_filter_rarity}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {RARITIES.map((r) => {
            const count = rarityCounts[r.id] ?? 0;
            const active = tier === r.id;
            const locked = count === 0;
            return (
              <button
                key={r.id}
                disabled={locked}
                onClick={() => setTier(active ? null : r.id as RarityId)}
                title={r.label}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "7px 11px", borderRadius: 999, cursor: locked ? "default" : "pointer",
                  border: `1.5px solid ${active ? r.color + "88" : (locked ? "#F1F5F9" : "#E5E7EB")}`,
                  background: active ? r.color + "22" : (locked ? "#F8FAFC" : "#f9fafb"),
                  opacity: locked ? 0.55 : 1,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ color: locked ? "#CBD5E1" : r.color, fontSize: 15, lineHeight: 1 }}>✿</span>
                <span style={{ fontFamily: "var(--font-mono-landing, monospace)", fontSize: 11, fontWeight: 700, color: active ? r.colorDark : (locked ? "#CBD5E1" : "#9ca3af") }}>
                  {locked ? "—" : count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort */}
      <div style={{ padding: "0 14px 14px" }}>
        <div style={{ fontFamily: "var(--font-inter, sans-serif)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#94A3B8", textTransform: "uppercase", margin: "12px 0 6px" }}>
          {t.filter_sectionSort}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.id;
            return (
              <button key={opt.id} onClick={() => setSort(opt.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 20, cursor: "pointer", border: `1.5px solid ${active ? "#0369a1" : "#e5e7eb"}`, background: active ? "#eff6ff" : "#f9fafb", color: active ? "#0369a1" : "#6b7280", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                {t[opt.labelKey]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderTop: "1px solid #F1F5F9", background: "#FAFBFC" }}>
        <button onClick={clearAll} disabled={!hasFilters} style={{ fontFamily: "var(--font-inter, sans-serif)", fontSize: 12, fontWeight: 600, color: hasFilters ? "#5A6E84" : "#CBD5E1", background: "none", border: "none", cursor: hasFilters ? "pointer" : "default", padding: 0 }}>
          {t.profile_filter_clearAll}
        </button>
        <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 999, background: "#2F7A5F", color: "white", border: "none", cursor: "pointer", fontFamily: "var(--font-inter, sans-serif)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
          {i(t.profile_photos_countLabel, { n: filteredCount })} →
        </button>
      </div>
    </div>
  );
}
