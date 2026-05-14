"use client";

import { RARITIES } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import type { SortId, PeakForFilter } from "./usePeakFilters";

type Props = {
  isOpen: boolean;
  peaks: PeakForFilter[];
  filteredCount: number;
  tier: RarityId | null;
  setTier: (v: RarityId | null) => void;
  mythic: boolean;
  setMythic: (v: boolean) => void;
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

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-inter, sans-serif)",
  fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
  color: "#9ca3af", textTransform: "uppercase",
  margin: "0 0 8px",
};

const chipRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };

export function PeakFiltersPanel({
  isOpen, peaks, filteredCount, tier, setTier, mythic, setMythic,
  range, setRange, sort, setSort, ranges, clearAll, onClose,
}: Props) {
  const t = useT();

  const rarityCounts: Record<string, number> = {};
  for (const p of peaks) rarityCounts[p.rarityId] = (rarityCounts[p.rarityId] ?? 0) + 1;
  const mythicCount = peaks.filter((p) => p.isMythic).length;

  const rangeCounts: Record<string, number> = {};
  for (const p of peaks) if (p.mountainRange) rangeCounts[p.mountainRange] = (rangeCounts[p.mountainRange] ?? 0) + 1;

  const hasFilters = tier !== null || mythic || range !== null || sort !== "altitude_desc";

  return (
    <>
      <style>{`
        .rarity-pill-name { display: none; }
        @media (min-width: 640px) { .rarity-pill-name { display: inline; } }
      `}</style>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.45)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 301,
          background: "white", borderRadius: "24px 24px 0 0",
          maxHeight: "92svh", display: "flex", flexDirection: "column",
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: isOpen ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.34s cubic-bezier(0.32,0.72,0,1)",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.14)",
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "12px auto 0", flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>
            {t.profile_filter_title}
          </span>
          {hasFilters ? (
            <button onClick={clearAll} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#0369a1", cursor: "pointer", padding: "4px 0" }}>
              {t.profile_filter_clearAll}
            </button>
          ) : (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, lineHeight: 1 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 24, scrollbarWidth: "none" }}>

          {/* Rarity */}
          <div>
            <p style={sectionLabel}>{t.profile_filter_rarity}</p>
            <div style={chipRow}>
              {RARITIES.map((r) => {
                const count = rarityCounts[r.id] ?? 0;
                const active = !mythic && tier === r.id;
                const locked = count === 0;
                return (
                  <button
                    key={r.id}
                    disabled={locked}
                    onClick={() => { setMythic(false); setTier(active ? null : r.id as RarityId); }}
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
                    <span className="rarity-pill-name" style={{ fontSize: 11, fontWeight: 600, color: active ? r.colorDark : (locked ? "#CBD5E1" : "#6b7280") }}>{r.label}</span>
                    <span style={{ fontFamily: "var(--font-mono-landing, monospace)", fontSize: 11, fontWeight: 700, color: active ? r.colorDark : (locked ? "#CBD5E1" : "#9ca3af") }}>
                      {locked ? "—" : count}
                    </span>
                  </button>
                );
              })}
              {/* Mythic */}
              <button
                disabled={mythicCount === 0}
                onClick={() => { setMythic(!mythic); setTier(null); }}
                title="Mythic"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "7px 11px", borderRadius: 999,
                  cursor: mythicCount === 0 ? "default" : "pointer",
                  border: `1.5px solid ${mythic ? "#f59e0b88" : (mythicCount === 0 ? "#F1F5F9" : "#E5E7EB")}`,
                  background: mythic ? "#fffbeb" : (mythicCount === 0 ? "#F8FAFC" : "#f9fafb"),
                  opacity: mythicCount === 0 ? 0.55 : 1,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 13, lineHeight: 1 }}>⭐</span>
                <span className="rarity-pill-name" style={{ fontSize: 11, fontWeight: 600, color: mythic ? "#92400e" : (mythicCount === 0 ? "#CBD5E1" : "#6b7280") }}>Mythic</span>
                <span style={{ fontFamily: "var(--font-mono-landing, monospace)", fontSize: 11, fontWeight: 700, color: mythic ? "#92400e" : (mythicCount === 0 ? "#CBD5E1" : "#9ca3af") }}>
                  {mythicCount === 0 ? "—" : mythicCount}
                </span>
              </button>
            </div>
          </div>

          {/* Range */}
          {ranges.length > 0 && (
            <div>
              <p style={sectionLabel}>{t.profile_filter_range}</p>
              <div style={chipRow}>
                {ranges.map((r) => {
                  const active = range === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setRange(active ? null : r)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "8px 14px", borderRadius: 20, cursor: "pointer",
                        border: `1.5px solid ${active ? "#0369a1" : "#e5e7eb"}`,
                        background: active ? "#eff6ff" : "#f9fafb",
                        color: active ? "#0369a1" : "#6b7280",
                        fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                      }}
                    >
                      {r}
                      <span style={{ fontFamily: "var(--font-mono-landing, monospace)", fontSize: 11, fontWeight: 700, color: active ? "#0369a188" : "rgba(107,114,128,0.5)" }}>
                        {rangeCounts[r]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sort */}
          <div>
            <p style={sectionLabel}>{t.filter_sectionSort}</p>
            <div style={chipRow}>
              {SORT_OPTIONS.map((opt) => {
                const active = sort === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSort(opt.id)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "8px 14px", borderRadius: 20, cursor: "pointer",
                      border: `1.5px solid ${active ? "#0369a1" : "#e5e7eb"}`,
                      background: active ? "#eff6ff" : "#f9fafb",
                      color: active ? "#0369a1" : "#6b7280",
                      fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                    }}
                  >
                    {t[opt.key]}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer CTA */}
        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "16px",
              background: "#2F7A5F", color: "white", border: "none",
              borderRadius: 14, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "0 4px 14px rgba(47,122,95,0.32)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {i(t.profile_filter_showN, { n: filteredCount })}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
