"use client";

import { RARITIES, RARITY_COLORS } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { RarityFlower } from "@/components/brand/RarityFlowers";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import type { SortId, PeakForFilter } from "./usePeakFilters";

type Props = {
  peaks: PeakForFilter[];       // full unfiltered list for counts
  filteredCount: number;
  tier: RarityId | null;
  setTier: (v: RarityId | null) => void;
  range: string | null;
  setRange: (v: string | null) => void;
  sort: SortId;
  setSort: (v: SortId) => void;
  ranges: string[];
  clearAll: () => void;
  onClose: () => void;
};

const SORT_OPTIONS: { id: SortId; key: keyof ReturnType<typeof useT> }[] = [
  { id: "altitude_desc", key: "profile_sort_altDesc" },
  { id: "altitude_asc",  key: "profile_sort_altAsc" },
  { id: "count_desc",    key: "profile_sort_countDesc" },
  { id: "recent",        key: "profile_sort_recent" },
  { id: "alpha",         key: "profile_sort_alpha" },
];

export function PeakFiltersPanel({
  peaks, filteredCount, tier, setTier, range, setRange,
  sort, setSort, ranges, clearAll, onClose,
}: Props) {
  const t = useT();

  // Count peaks per rarity
  const rarityCounts: Record<string, number> = {};
  for (const p of peaks) {
    rarityCounts[p.rarityId] = (rarityCounts[p.rarityId] ?? 0) + 1;
  }

  // Count peaks per range
  const rangeCounts: Record<string, number> = {};
  for (const p of peaks) {
    if (p.mountainRange) {
      rangeCounts[p.mountainRange] = (rangeCounts[p.mountainRange] ?? 0) + 1;
    }
  }

  const hasFilters = tier !== null || range !== null || sort !== "altitude_desc";

  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      border: "1px solid #E5E7EB",
      boxShadow: "0 4px 24px rgba(13,37,56,0.08)",
      overflow: "hidden",
      margin: "0 0 12px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px",
        borderBottom: "1px solid #F1F5F9",
      }}>
        <span style={{
          fontFamily: "var(--font-space-grotesk, sans-serif)",
          fontSize: 14, fontWeight: 700, color: "#0D2538",
          letterSpacing: "-0.01em",
        }}>
          {t.profile_filter_title}
        </span>
        <button
          onClick={onClose}
          style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "#F1F5F9", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#5A6E84" strokeWidth="2.6" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>

      {/* Rarity section */}
      <div style={{ padding: "14px 14px 4px" }}>
        <div style={{
          fontFamily: "var(--font-mono-landing, monospace)",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
          color: "#94A3B8", textTransform: "uppercase",
          marginBottom: 6,
        }}>
          {t.profile_filter_rarity}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {RARITIES.map((r) => {
            const count = rarityCounts[r.id] ?? 0;
            const active = tier === r.id;
            const locked = count === 0;
            return (
              <button
                key={r.id}
                disabled={locked}
                onClick={() => setTier(active ? null : r.id as RarityId)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 12, cursor: locked ? "default" : "pointer",
                  border: `1px solid ${active ? r.color : (locked ? "#F1F5F9" : r.color + "55")}`,
                  background: active ? r.color : (locked ? "#F8FAFC" : "white"),
                  opacity: locked ? 0.55 : 1,
                  transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  background: active ? "white" : r.color + "22",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <RarityFlower id={r.id} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: 12, fontWeight: 700,
                    color: active ? "white" : (locked ? "#94A3B8" : r.colorDark),
                    lineHeight: 1.2,
                  }}>
                    {r.label}
                  </div>
                </div>
                <span style={{
                  fontFamily: "var(--font-mono-landing, monospace)",
                  fontSize: 11, fontWeight: 800,
                  padding: "2px 7px", borderRadius: 999,
                  background: active ? "rgba(255,255,255,0.22)" : (locked ? "transparent" : r.color + "22"),
                  color: active ? "white" : (locked ? "#CBD5E1" : r.colorDark),
                  flexShrink: 0,
                }}>
                  {locked ? "—" : count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Range section */}
      {ranges.length > 0 && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{
            fontFamily: "var(--font-mono-landing, monospace)",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
            color: "#94A3B8", textTransform: "uppercase",
            margin: "12px 0 6px",
          }}>
            {t.profile_filter_range}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ranges.map((r) => {
              const active = range === r;
              return (
                <button
                  key={r}
                  onClick={() => setRange(active ? null : r)}
                  style={{
                    padding: "6px 10px", borderRadius: 999,
                    border: `1px solid ${active ? "#0D2538" : "#E5E7EB"}`,
                    background: active ? "#0D2538" : "white",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <span style={{
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: 12, fontWeight: 600,
                    color: active ? "white" : "#374151",
                  }}>
                    {r}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-mono-landing, monospace)",
                    fontSize: 10, fontWeight: 700,
                    color: active ? "rgba(255,255,255,0.7)" : "rgba(55,65,81,0.5)",
                  }}>
                    {rangeCounts[r]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sort section */}
      <div style={{ padding: "0 14px 14px" }}>
        <div style={{
          fontFamily: "var(--font-mono-landing, monospace)",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
          color: "#94A3B8", textTransform: "uppercase",
          margin: "0 0 6px",
        }}>
          {t.profile_filter_sort}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSort(opt.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${active ? "#0D2538" : "#F1F5F9"}`,
                  background: active ? "#0D2538" : "#F8FAFC",
                }}
              >
                {/* Radio dot */}
                <div style={{
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  border: `1.5px solid ${active ? "transparent" : "#CBD5E1"}`,
                  background: active ? "white" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {active && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D2538" }} />
                  )}
                </div>
                <span style={{
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontSize: 12, fontWeight: 600,
                  color: active ? "white" : "#374151",
                }}>
                  {t[opt.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px",
        borderTop: "1px solid #F1F5F9",
        background: "#FAFBFC",
      }}>
        <button
          onClick={clearAll}
          disabled={!hasFilters}
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: 12, fontWeight: 600,
            color: hasFilters ? "#5A6E84" : "#CBD5E1",
            background: "none", border: "none", cursor: hasFilters ? "pointer" : "default",
            padding: 0,
          }}
        >
          {t.profile_filter_clearAll}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: "9px 16px", borderRadius: 999,
            background: "#2F7A5F", color: "white", border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          {i(t.profile_filter_showN, { n: filteredCount })}
          <span style={{ fontSize: 13 }}>→</span>
        </button>
      </div>
    </div>
  );
}
