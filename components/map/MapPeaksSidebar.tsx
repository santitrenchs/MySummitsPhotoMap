"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { MapPeak, AscentMapEntry, MapBounds, RarityDef } from "./MapView";
import { RARITY_SCORE_WEIGHTS } from "./MapView";
import MapPeakCard from "./MapPeakCard";
import MapFilterBar from "./MapFilterBar";

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
  // Sheet mode (mobile)
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
  asSheet = false, onClose,
}: Props) {
  const [sort, setSort] = useState<SortMode>("distance");
  const [sortOpen, setSortOpen] = useState(false);
  const [uncapturedOnly, setUncapturedOnly] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const selectedCardRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MapPeak[]>([]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/peaks?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data: MapPeak[] = await res.json();
        setSearchResults(data.slice(0, 8));
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close sort dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

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

  // 1. Apply status + rarity + uncaptured filters (no bounds filter)
  const filteredPeaks = useMemo(() => {
    const activeRarity = mythicOnly ? ["mythic"] : rarityFilter;
    return peaks.filter((p) => {
      const hasAscent = ascentByPeakId.has(p.id);
      if (filter === "climbed" && !hasAscent) return false;
      if (filter === "not-climbed" && hasAscent) return false;
      if (uncapturedOnly && hasAscent) return false;
      if (activeRarity.length > 0 && !activeRarity.includes(p.rarityId ?? "")) return false;
      return true;
    });
  }, [peaks, ascentByPeakId, filter, rarityFilter, mythicOnly, uncapturedOnly]);

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

  const containerStyle: React.CSSProperties = asSheet
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
        width: 320,
        display: "flex", flexDirection: "column",
        borderRadius: 16,
        background: "white",
        boxShadow: "0 2px 20px rgba(0,0,0,0.14)",
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

      {/* Search input */}
      <div style={{ padding: "10px 12px", flexShrink: 0, borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 13, pointerEvents: "none", color: "#9ca3af",
          }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cima…"
            style={{
              width: "100%", padding: "8px 28px 8px 30px",
              borderRadius: 10, border: "none",
              fontSize: 14, fontWeight: 500, color: "#111827",
              background: "#f3f4f6", outline: "none", boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button
              onMouseDown={() => setSearchQuery("")}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "#9ca3af", fontSize: 13, lineHeight: 1, padding: 2,
              }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        padding: "8px 12px", flexShrink: 0,
        borderBottom: "1px solid #f3f4f6",
        display: "flex", gap: 8, flexWrap: "wrap",
      }}>
        <MapFilterBar
          filter={filter}
          onFilterChange={onFilterChange}
          rarityFilter={rarityFilter}
          onRarityChange={onRarityChange}
          mythicOnly={mythicOnly}
          onMythicToggle={onMythicToggle}
          rarities={rarities}
          climbedCount={climbedCount}
        />
      </div>

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
              return (
                <button
                  key={peak.id}
                  onMouseDown={() => { onSelectPeak(peak); setSearchQuery(""); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "10px 14px",
                    background: "none", border: "none", borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{isClimbed ? "✅" : "🏔"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {peak.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                      {peak.altitudeM} m{peak.mountainRange ? ` · ${peak.mountainRange}` : ""}
                    </p>
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
    </div>
  );
}
