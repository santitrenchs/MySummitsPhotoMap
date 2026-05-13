"use client";

import { RARITY_COLORS } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { useT } from "@/components/providers/I18nProvider";
import type { SortId } from "./usePeakFilters";

type Props = {
  query: string;
  setQuery: (v: string) => void;
  tier: RarityId | null;
  setTier: (v: RarityId | null) => void;
  range: string | null;
  setRange: (v: string | null) => void;
  sort: SortId | string;
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  searchPlaceholder?: string;
};

export function PeakFiltersBar({
  query, setQuery,
  tier, setTier,
  range, setRange,
  sort,
  filtersOpen, setFiltersOpen,
  hasActiveFilters, activeFilterCount,
  searchPlaceholder,
}: Props) {
  const t = useT();
  const placeholder = searchPlaceholder ?? t.profile_filter_searchPlaceholder;

  return (
    <div>
      {/* Search + Filters button row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "0 16px 12px" }}>
        {/* Search input */}
        <div style={{ flex: 1, position: "relative" }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            style={{
              width: "100%", padding: "10px 12px 10px 32px",
              background: "white",
              border: "1px solid #E5E7EB",
              borderRadius: 12,
              boxShadow: "0 1px 2px rgba(13,37,56,0.04)",
              fontSize: 16,
              color: "#0D2538",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filters button */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          style={{
            padding: "10px 14px", borderRadius: 12,
            border: `1px solid ${filtersOpen ? "#0D2538" : "#E5E7EB"}`,
            background: filtersOpen ? "#0D2538" : "white",
            boxShadow: "0 1px 2px rgba(13,37,56,0.04)",
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            flexShrink: 0,
            position: "relative",
          }}
        >
          {/* Filter icon */}
          <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke={filtersOpen ? "white" : "#374151"} strokeWidth="1.8" strokeLinecap="round">
            <line x1="0" y1="2" x2="14" y2="2" />
            <line x1="2" y1="6" x2="12" y2="6" />
            <line x1="4" y1="10" x2="10" y2="10" />
          </svg>
          <span style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: 13, fontWeight: 700,
            color: filtersOpen ? "white" : "#374151",
          }}>
            {t.profile_filter_button}
          </span>
          {/* Active badge */}
          {hasActiveFilters && (
            <div style={{
              position: "absolute", top: -6, right: -6,
              width: 16, height: 16, borderRadius: "50%",
              background: filtersOpen ? "white" : "#FF5D2D",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontFamily: "var(--font-mono-landing, monospace)",
                fontSize: 10, fontWeight: 800,
                color: filtersOpen ? "#0D2538" : "white",
              }}>
                {activeFilterCount}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Active filter chips (when panel is closed) */}
      {!filtersOpen && hasActiveFilters && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 8px" }}>
          {tier && (
            <ActiveChip
              label={tier}
              color={RARITY_COLORS[tier] ?? "#0D2538"}
              onRemove={() => setTier(null)}
            />
          )}
          {range && (
            <ActiveChip
              label={range}
              color="#0D2538"
              onRemove={() => setRange(null)}
            />
          )}
          {sort !== "altitude_desc" && (
            <ActiveChip
              label={sort.replace(/_/g, " ")}
              color="#2F7A5F"
              onRemove={() => {/* sort cleared via clearAll or panel */}}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ActiveChip({ label, color, onRemove }: { label: string; color: string; onRemove: () => void }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 8px 4px 10px",
      background: "white",
      border: `1px solid ${color}55`,
      borderRadius: 999,
    }}>
      <span style={{
        fontFamily: "var(--font-inter, sans-serif)",
        fontSize: 12, fontWeight: 600, color,
      }}>
        {label}
      </span>
      <button
        onClick={onRemove}
        style={{
          width: 16, height: 16, borderRadius: "50%",
          background: color + "1A",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 0,
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
        </svg>
      </button>
    </div>
  );
}
