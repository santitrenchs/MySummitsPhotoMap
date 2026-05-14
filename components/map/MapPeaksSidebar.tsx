"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { MapPeak, AscentMapEntry, MapBounds, RarityDef } from "./MapView";
import { RARITY_SCORE_WEIGHTS } from "./MapView";
import { RARITY_COLORS, RARITIES } from "@/lib/rarity";
import { RarityFlower } from "@/components/brand/RarityFlowers";
import MapPeakCard from "./MapPeakCard";

type Filter = "all" | "climbed" | "not-climbed";
type SortMode = "distance" | "relevance" | "altitude";

const TOP_N = 25;

interface Props {
  peaks: MapPeak[];
  ascentByPeakId: Map<string, AscentMapEntry>;
  mapBounds: MapBounds | null;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  rarityFilter: string[];
  onRarityChange: (ids: string[]) => void;
  mythicOnly: boolean;
  onMythicToggle: () => void;
  rarities: RarityDef[];
  climbedCount: number;
  selectedPeakId: string | null;
  onSelectPeak: (peak: MapPeak) => void;
  // Controlled search (lifted to MapView)
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResults: MapPeak[];
  hideSearchInput?: boolean;
  hideFilters?: boolean;
  asMobileList?: boolean;
  // Optional controlled sort (lifted to MapView for mobile)
  sort?: SortMode;
  onSortChange?: (s: SortMode) => void;
  // Sheet mode (mobile legacy)
  asSheet?: boolean;
  onClose?: () => void;
}

// ─── Haversine distance ───────────────────────────────────────────────────────

function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapPeaksSidebar({
  peaks, ascentByPeakId, mapBounds,
  filter, onFilterChange, rarityFilter, onRarityChange, mythicOnly, onMythicToggle, rarities, climbedCount,
  selectedPeakId, onSelectPeak,
  searchQuery, onSearchChange, searchResults,
  hideSearchInput = false, hideFilters = false, asMobileList = false,
  sort: sortProp, onSortChange,
  asSheet = false, onClose,
}: Props) {
  const [internalSort, setInternalSort] = useState<SortMode>("distance");
  const sort = sortProp ?? internalSort;
  const setSort = (s: SortMode) => { onSortChange ? onSortChange(s) : setInternalSort(s); };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selectedCardRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Drag-to-close for sheet mode
  const [dragY, setDragY] = useState(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  const selectedPeakCoords = useMemo(() => {
    if (!selectedPeakId) return null;
    const sel = peaks.find((p) => p.id === selectedPeakId);
    return sel ? { lat: sel.latitude, lng: sel.longitude } : null;
  }, [selectedPeakId, peaks]);

  const centerLat = selectedPeakCoords?.lat
    ?? (mapBounds ? (mapBounds.north + mapBounds.south) / 2 : null);
  const centerLng = selectedPeakCoords?.lng
    ?? (mapBounds ? (mapBounds.east + mapBounds.west) / 2 : null);

  // 1. Apply status + rarity filters (no bounds filter)
  const filteredPeaks = useMemo(() => {
    return peaks.filter((p) => {
      const hasAscent = ascentByPeakId.has(p.id);
      if (filter === "climbed" && !hasAscent) return false;
      if (filter === "not-climbed" && hasAscent) return false;
      if (mythicOnly && !p.isMythic) return false;
      if (rarityFilter.length > 0 && !rarityFilter.includes(p.rarityId ?? "")) return false;
      return true;
    });
  }, [peaks, ascentByPeakId, filter, rarityFilter, mythicOnly]);

  // 2. Compute top N nearest to center, then sort by selected mode
  const sortedPeaks = useMemo(() => {
    if (centerLat === null || centerLng === null) {
      return filteredPeaks.slice(0, TOP_N);
    }

    // Attach distance to each peak, find top N nearest
    const withDist = filteredPeaks.map((p) => ({
      peak: p,
      dist: distKm(centerLat, centerLng, p.latitude, p.longitude),
    }));
    withDist.sort((a, b) => a.dist - b.dist);
    const nearest = withDist.slice(0, TOP_N);

    if (sort === "distance") {
      return nearest.map((x) => x.peak);
    }

    if (sort === "altitude") {
      nearest.sort((a, b) => b.peak.altitudeM - a.peak.altitudeM);
      return nearest.map((x) => x.peak);
    }

    // relevance: score = (1/(dist+0.1))*0.5 + rarity_weight*0.3 + (alt/maxAlt)*0.2
    let maxAlt = 0;
    for (const x of nearest) if (x.peak.altitudeM > maxAlt) maxAlt = x.peak.altitudeM;

    nearest.sort((a, b) => {
      const rarityA = RARITY_SCORE_WEIGHTS[a.peak.rarityId ?? ""] ?? 0;
      const rarityB = RARITY_SCORE_WEIGHTS[b.peak.rarityId ?? ""] ?? 0;
      const altA = maxAlt > 0 ? a.peak.altitudeM / maxAlt : 0;
      const altB = maxAlt > 0 ? b.peak.altitudeM / maxAlt : 0;
      const scoreA = (1 / (a.dist + 0.1)) * 0.5 + rarityA * 0.3 + altA * 0.2;
      const scoreB = (1 / (b.dist + 0.1)) * 0.5 + rarityB * 0.3 + altB * 0.2;
      return scoreB - scoreA;
    });
    return nearest.map((x) => x.peak);
  }, [filteredPeaks, sort, centerLat, centerLng]);

  // Ensure selected peak is always visible in the list (prepend if not in top-25)
  const visiblePeaks = useMemo(() => {
    if (!selectedPeakId) return sortedPeaks;
    const inList = sortedPeaks.some((p) => p.id === selectedPeakId);
    if (inList) return sortedPeaks;
    const sel = peaks.find((p) => p.id === selectedPeakId);
    return sel ? [sel, ...sortedPeaks] : sortedPeaks;
  }, [sortedPeaks, selectedPeakId, peaks]);

  // Distance lookup for cards
  const distMap = useMemo(() => {
    if (centerLat === null || centerLng === null) return new Map<string, number>();
    const m = new Map<string, number>();
    for (const p of visiblePeaks) {
      m.set(p.id, distKm(centerLat, centerLng, p.latitude, p.longitude));
    }
    return m;
  }, [visiblePeaks, centerLat, centerLng]);

  // Auto-scroll: always center the selected card in the visible list area
  useEffect(() => {
    if (!selectedPeakId || !listRef.current || !selectedCardRef.current) return;
    const list = listRef.current;
    const card = selectedCardRef.current;
    const cardMid = card.offsetTop + card.offsetHeight / 2;
    const target = Math.max(0, cardMid - list.clientHeight / 2);
    list.scrollTo({ top: target, behavior: "smooth" });
  }, [selectedPeakId]);

  const sortLabels: Record<SortMode, string> = {
    distance:  "Más cercanas",
    altitude:  "Mayor altitud",
    relevance: "Más relevantes",
  };

  // Active filter count for badge
  const activeFilterCount = (filter !== "all" ? 1 : 0)
    + rarityFilter.length
    + (mythicOnly ? 1 : 0)
    + (sort !== "distance" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  // Rarity counts from all peaks (for the filter panel)
  const rarityCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of peaks) if (p.rarityId) m[p.rarityId] = (m[p.rarityId] ?? 0) + 1;
    return m;
  }, [peaks]);
  const mythicCount = useMemo(() => peaks.filter((p) => p.isMythic).length, [peaks]);

  // ── Sheet mode touch handlers ────────────────────────────────────────────

  function onSheetTouchStart(e: React.TouchEvent) {
    e.stopPropagation();
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }

  function onSheetTouchMove(e: React.TouchEvent) {
    e.stopPropagation();
    if (!isDragging.current) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setDragY(dy);
  }

  function onSheetTouchEnd(e: React.TouchEvent) {
    e.stopPropagation();
    isDragging.current = false;
    if (dragY > 60) { setDragY(0); onClose?.(); }
    else setDragY(0);
  }

  // ── Layout ───────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = asMobileList
    ? {
        position: "absolute", inset: 0,
        background: "white",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }
    : asSheet
    ? {
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: "62vh", zIndex: 40,
        background: "white", borderRadius: "18px 18px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        transform: `translateY(${dragY}px)`,
        transition: dragY === 0 ? "transform 0.22s ease" : "none",
        animation: "panelInMobile 0.28s ease both",
      }
    : {
        position: "absolute",
        top: 12, right: 12, bottom: 12,
        width: "var(--sidebar-w, 320px)" as unknown as number,
        display: "flex", flexDirection: "column",
        borderRadius: 16,
        background: "white",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        overflow: "hidden",
        zIndex: 10,
      };

  return (
    <div
      style={containerStyle}
      onTouchStart={asSheet ? onSheetTouchStart : undefined}
      onTouchMove={asSheet ? onSheetTouchMove : undefined}
      onTouchEnd={asSheet ? onSheetTouchEnd : undefined}
    >
      {/* Header */}
      {asSheet && (
        <div style={{ padding: "10px 14px 6px", flexShrink: 0, borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d1d5db", margin: "0 auto 10px" }} />
          {onClose && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={onClose}
                style={{
                  width: 24, height: 24, borderRadius: "50%", background: "#f3f4f6",
                  border: "none", cursor: "pointer", fontSize: 11, color: "#6b7280",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</button>
            </div>
          )}
        </div>
      )}

      {/* Search + Filter button bar */}
      {(!hideSearchInput || !hideFilters) && (
        <div style={{ padding: "10px 12px", flexShrink: 0, borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Search input */}
            {!hideSearchInput && (
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
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Buscar cima…"
                  style={{
                    width: "100%", padding: "9px 28px 9px 30px",
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 1px 2px rgba(13,37,56,0.04)",
                    fontSize: 14, fontWeight: 500, color: "#0D2538",
                    background: "white", outline: "none", boxSizing: "border-box",
                  }}
                />
                {searchQuery && (
                  <button
                    onMouseDown={() => onSearchChange("")}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "#9ca3af", fontSize: 13, lineHeight: 1, padding: 2,
                    }}
                  >✕</button>
                )}
              </div>
            )}

            {/* Filter button */}
            {!hideFilters && (
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                style={{
                  padding: "9px 12px", borderRadius: 10,
                  border: `1px solid ${filtersOpen ? "#0D2538" : "#E5E7EB"}`,
                  background: filtersOpen ? "#0D2538" : "white",
                  boxShadow: "0 1px 2px rgba(13,37,56,0.04)",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  flexShrink: 0, position: "relative",
                }}
              >
                <svg width="14" height="12" viewBox="0 0 14 12" fill="none"
                  stroke={filtersOpen ? "white" : "#374151"}
                  strokeWidth="1.8" strokeLinecap="round"
                >
                  <line x1="0" y1="2" x2="14" y2="2" />
                  <line x1="2" y1="6" x2="12" y2="6" />
                  <line x1="4" y1="10" x2="10" y2="10" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: filtersOpen ? "white" : "#374151" }}>
                  Filtrar
                </span>
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
                    }}>{activeFilterCount}</span>
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Active chips (when panel is closed) */}
          {!hideFilters && !filtersOpen && hasActiveFilters && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {filter !== "all" && (
                <ActiveChip
                  label={filter === "climbed" ? `✓ Capturadas (${climbedCount})` : "Sin capturar"}
                  color="#16a34a"
                  onRemove={() => onFilterChange("all")}
                />
              )}
              {rarityFilter.map((id) => {
                const rEntry = RARITIES.find((r) => r.id === id);
                return rEntry ? (
                  <ActiveChip
                    key={id}
                    label={`✿ ${rEntry.label}`}
                    color={rEntry.color}
                    onRemove={() => onRarityChange(rarityFilter.filter((r) => r !== id))}
                  />
                ) : null;
              })}
              {mythicOnly && (
                <ActiveChip label="⭐ Mythic" color="#f59e0b" onRemove={onMythicToggle} />
              )}
              {sort !== "distance" && (
                <ActiveChip
                  label={sortLabels[sort]}
                  color="#0369a1"
                  onRemove={() => setSort("distance")}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div ref={listRef} style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
        {searchQuery.trim().length >= 2 ? (
          searchResults.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              Sin resultados
            </div>
          ) : (
            searchResults.map((peak) => {
              const isClimbed = ascentByPeakId.has(peak.id);
              const rc = peak.rarityId ? (RARITY_COLORS[peak.rarityId] ?? "#6b7280") : "#6b7280";
              const rarityEntry = peak.rarityId ? RARITIES.find((r) => r.id === peak.rarityId) : null;
              return (
                <button
                  key={peak.id}
                  onMouseDown={() => { onSelectPeak(peak); onSearchChange(""); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "10px 14px",
                    background: "none", border: "none",
                    borderBottom: "1px solid #f3f4f6",
                    borderLeft: `3px solid ${rc}`,
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {peak.name}
                      </p>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", flexShrink: 0 }}>
                        {peak.altitudeM} m
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                      <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                        {peak.mountainRange ?? ""}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {isClimbed && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "1px 5px" }}>
                            ✓ Capturada
                          </span>
                        )}
                        {peak.rarity && rarityEntry && (
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 3,
                            padding: "2px 7px", borderRadius: 999,
                            background: rc + "22",
                          }}>
                            <RarityFlower id={rarityEntry.id} size={10} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: rarityEntry.colorDark, whiteSpace: "nowrap" }}>
                              {peak.rarity.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )
        ) : visiblePeaks.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            No hay cimas con los filtros activos
          </div>
        ) : (
          visiblePeaks.map((peak) => {
            const isSelected = peak.id === selectedPeakId;
            return (
              <div key={peak.id} ref={isSelected ? selectedCardRef : undefined}>
                <MapPeakCard
                  peak={peak}
                  ascent={ascentByPeakId.get(peak.id)}
                  distanceKm={distMap.get(peak.id) ?? null}
                  selected={isSelected}
                  onClick={() => onSelectPeak(peak)}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Filter panel — bottom sheet portal */}
      {!hideFilters && typeof document !== "undefined" && createPortal(
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
              opacity: filtersOpen ? 1 : 0,
              pointerEvents: filtersOpen ? "auto" : "none",
              transition: "opacity 0.3s",
            }}
            onClick={() => setFiltersOpen(false)}
          />

          {/* Sheet */}
          <div style={{
            position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 301,
            background: "white", borderRadius: "24px 24px 0 0",
            maxHeight: "92svh", display: "flex", flexDirection: "column",
            paddingBottom: "env(safe-area-inset-bottom)",
            transform: filtersOpen ? "translateY(0)" : "translateY(110%)",
            transition: "transform 0.34s cubic-bezier(0.32,0.72,0,1)",
            boxShadow: "0 -4px 40px rgba(0,0,0,0.14)",
          }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "12px auto 0", flexShrink: 0 }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>
                Filtros
              </span>
              {hasActiveFilters ? (
                <button
                  onClick={() => {
                    onFilterChange("all");
                    onRarityChange([]);
                    if (mythicOnly) onMythicToggle();
                    setSort("distance");
                  }}
                  style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#0369a1", cursor: "pointer", padding: "4px 0" }}
                >
                  Borrar todo
                </button>
              ) : (
                <button onClick={() => setFiltersOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, lineHeight: 1 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Body */}
            <div style={{ overflowY: "auto", flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 24, scrollbarWidth: "none" }}>

              {/* Rareza */}
              <div>
                <p style={{ fontFamily: "var(--font-inter, sans-serif)", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#9ca3af", textTransform: "uppercase", margin: "0 0 8px" }}>
                  Rareza
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {RARITIES.map((r) => {
                    const count = rarityCounts[r.id] ?? 0;
                    const active = rarityFilter.includes(r.id);
                    const locked = count === 0;
                    return (
                      <button
                        key={r.id}
                        disabled={locked}
                        onClick={() => {
                          onRarityChange(active ? rarityFilter.filter((x) => x !== r.id) : [...rarityFilter, r.id]);
                        }}
                        title={r.label}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "7px 11px", borderRadius: 999, cursor: locked ? "default" : "pointer",
                          border: `1.5px solid ${active ? r.color + "88" : (locked ? "#F1F5F9" : "#E5E7EB")}`,
                          background: active ? r.color + "22" : (locked ? "#F8FAFC" : "#f9fafb"),
                          opacity: locked ? 0.55 : 1, transition: "all 0.15s",
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
                    onClick={() => { onMythicToggle(); }}
                    title="Mythic"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "7px 11px", borderRadius: 999,
                      cursor: mythicCount === 0 ? "default" : "pointer",
                      border: `1.5px solid ${mythicOnly ? "#f59e0b88" : (mythicCount === 0 ? "#F1F5F9" : "#E5E7EB")}`,
                      background: mythicOnly ? "#fffbeb" : (mythicCount === 0 ? "#F8FAFC" : "#f9fafb"),
                      opacity: mythicCount === 0 ? 0.55 : 1, transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 13, lineHeight: 1 }}>⭐</span>
                    <span className="rarity-pill-name" style={{ fontSize: 11, fontWeight: 600, color: mythicOnly ? "#92400e" : (mythicCount === 0 ? "#CBD5E1" : "#6b7280") }}>Mythic</span>
                    <span style={{ fontFamily: "var(--font-mono-landing, monospace)", fontSize: 11, fontWeight: 700, color: mythicOnly ? "#92400e" : (mythicCount === 0 ? "#CBD5E1" : "#9ca3af") }}>
                      {mythicCount === 0 ? "—" : mythicCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Estado */}
              <div>
                <p style={{ fontFamily: "var(--font-inter, sans-serif)", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#9ca3af", textTransform: "uppercase", margin: "0 0 8px" }}>
                  Estado
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {([
                    { value: "all" as Filter, label: "Todas" },
                    { value: "climbed" as Filter, label: `Capturadas (${climbedCount})` },
                    { value: "not-climbed" as Filter, label: "Sin capturar" },
                  ] as const).map((opt) => {
                    const active = filter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => onFilterChange(opt.value)}
                        style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "8px 14px", borderRadius: 20, cursor: "pointer",
                          border: `1.5px solid ${active ? "#0369a1" : "#e5e7eb"}`,
                          background: active ? "#eff6ff" : "#f9fafb",
                          color: active ? "#0369a1" : "#6b7280",
                          fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ordenar */}
              <div>
                <p style={{ fontFamily: "var(--font-inter, sans-serif)", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#9ca3af", textTransform: "uppercase", margin: "0 0 8px" }}>
                  Ordenar
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(Object.entries(sortLabels) as [SortMode, string][]).map(([mode, label]) => {
                    const active = sort === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => setSort(mode)}
                        style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "8px 14px", borderRadius: 20, cursor: "pointer",
                          border: `1.5px solid ${active ? "#0369a1" : "#e5e7eb"}`,
                          background: active ? "#eff6ff" : "#f9fafb",
                          color: active ? "#0369a1" : "#6b7280",
                          fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer CTA */}
            <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
              <button
                onClick={() => setFiltersOpen(false)}
                style={{
                  width: "100%", padding: "16px",
                  background: "#2F7A5F", color: "white", border: "none",
                  borderRadius: 14, fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(47,122,95,0.32)", cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 800 }}>
                  Ver {filteredPeaks.length} {filteredPeaks.length === 1 ? "cima" : "cimas"}
                </span>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── Active chip ──────────────────────────────────────────────────────────────

function ActiveChip({ label, color, onRemove }: { label: string; color: string; onRemove: () => void }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 8px 4px 10px",
      background: "white",
      border: `1px solid ${color}55`,
      borderRadius: 999,
    }}>
      <span style={{ fontFamily: "var(--font-inter, sans-serif)", fontSize: 12, fontWeight: 600, color }}>
        {label}
      </span>
      <button
        onClick={onRemove}
        style={{
          width: 16, height: 16, borderRadius: "50%",
          background: color + "1A", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
        </svg>
      </button>
    </div>
  );
}
