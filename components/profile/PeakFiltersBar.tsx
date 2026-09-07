"use client";

import { RARITY_COLORS } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { useT } from "@/components/providers/I18nProvider";
import { SearchField } from "@/components/ui/SearchField";
import { FilterButton } from "@/components/ui/FilterButton";
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
      {/* Search + Filters button row — shared components, so this bar and every other
          filter bar in the app can never drift apart again. */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "0 16px 12px" }}>
        <SearchField value={query} onChange={setQuery} placeholder={placeholder} variant="outlined" />
        <FilterButton
          label={t.profile_filter_button}
          active={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
          badgeCount={hasActiveFilters ? activeFilterCount : 0}
        />
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
      borderRadius: "var(--radius-full)",
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
