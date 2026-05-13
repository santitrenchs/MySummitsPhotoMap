"use client";

import { useState } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { PeaksCatalogHeader } from "./PeaksCatalogHeader";
import { PeakFiltersBar } from "./PeakFiltersBar";
import { PeakFiltersPanel } from "./PeakFiltersPanel";
import { PeakRowCard } from "./PeakRowCard";
import { usePeakFilters } from "./usePeakFilters";
import type { PeakForFilter } from "./usePeakFilters";

type Props = {
  peaks: PeakForFilter[];
};

export function PeaksTabV2({ peaks }: Props) {
  const t = useT();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const {
    query, setQuery,
    tier, setTier,
    mythic, setMythic,
    range, setRange,
    sort, setSort,
    filtered,
    ranges,
    hasActiveFilters,
    clearAll,
  } = usePeakFilters(peaks);

  const activeFilterCount = [tier !== null, mythic, range !== null, sort !== "altitude_desc"].filter(Boolean).length;

  if (peaks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 16px", color: "#9ca3af", fontSize: 14 }}>
        —
      </div>
    );
  }

  return (
    <div style={{ background: "#F4F7FA", margin: "0 -16px", padding: "0 16px" }}>
      {/* Catalog header */}
      <PeaksCatalogHeader peaks={peaks} tier={tier} setTier={setTier} />

      {/* Sticky filter bar */}
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
          range={range} setRange={setRange}
          sort={sort}
          filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Filter panel (bottom sheet) */}
      <PeakFiltersPanel
        isOpen={filtersOpen}
        peaks={peaks}
        filteredCount={filtered.length}
        tier={tier} setTier={setTier}
        mythic={mythic} setMythic={setMythic}
        range={range} setRange={setRange}
        sort={sort} setSort={setSort}
        ranges={ranges}
        clearAll={clearAll}
        onClose={() => setFiltersOpen(false)}
      />

      {/* Peak list */}
      {filtered.length === 0 ? (
        <div style={{
          margin: "24px 0",
          background: "white",
          borderRadius: 16,
          border: "1px solid #E5E7EB",
          padding: "32px 20px",
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 16, fontWeight: 700, color: "#0D2538",
            marginBottom: 6,
          }}>
            {t.profile_emptyFiltered_title}
          </div>
          <div style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: 13, color: "#5A6E84",
          }}>
            {t.profile_emptyFiltered_body}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0 32px" }}>
          {filtered.map((peak) => (
            <PeakRowCard key={peak.id} peak={peak} dateLocale={t.dateLocale} />
          ))}
        </div>
      )}
    </div>
  );
}
