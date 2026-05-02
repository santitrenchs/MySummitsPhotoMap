"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { MapPeak, AscentMapEntry, MapBounds } from "./MapView";
import { RARITY_SCORE_WEIGHTS } from "./MapView";
import MapPeakCard from "./MapPeakCard";

type Filter = "all" | "climbed" | "not-climbed";
type SortMode = "distance" | "relevance" | "altitude";

const TOP_N = 25;

interface Props {
  peaks: MapPeak[];
  ascentByPeakId: Map<string, AscentMapEntry>;
  mapBounds: MapBounds | null;
  filter: Filter;
  rarityFilter: string[];
  mythicOnly: boolean;
  selectedPeakId: string | null;
  onSelectPeak: (peak: MapPeak) => void;
  // Expanded detail card
  selectedPeak?: { peak: MapPeak; ascent: AscentMapEntry | null };
  onActionCapture?: (peakId: string, peakName: string) => void;
  onActionView?: (href: string) => void;
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
  filter, rarityFilter, mythicOnly,
  selectedPeakId, onSelectPeak,
  selectedPeak, onActionCapture, onActionView,
  asSheet = false, onClose,
}: Props) {
  const [sort, setSort] = useState<SortMode>("distance");
  const [sortOpen, setSortOpen] = useState(false);
  const [uncapturedOnly, setUncapturedOnly] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const selectedCardRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  const centerLat = mapBounds ? (mapBounds.north + mapBounds.south) / 2 : null;
  const centerLng = mapBounds ? (mapBounds.east + mapBounds.west) / 2 : null;

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
    if (!selectedPeak) return sortedPeaks;
    const inList = sortedPeaks.some((p) => p.id === selectedPeak.peak.id);
    if (inList) return sortedPeaks;
    return [selectedPeak.peak, ...sortedPeaks];
  }, [sortedPeaks, selectedPeak]);

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
    if (!selectedPeak || !listRef.current || !selectedCardRef.current) return;
    const list = listRef.current;
    const card = selectedCardRef.current;
    const cardMid = card.offsetTop + card.offsetHeight / 2;
    const target = Math.max(0, cardMid - list.clientHeight / 2);
    list.scrollTo({ top: target, behavior: "smooth" });
  }, [selectedPeak]);

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
      <div style={{
        padding: "12px 14px 10px", flexShrink: 0,
        borderBottom: "1px solid #e5e7eb",
        background: "white",
      }}>
        {asSheet && (
          <div style={{
            width: 36, height: 4, borderRadius: 2, background: "#d1d5db",
            margin: "0 auto 12px", flexShrink: 0,
          }} />
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827", flexShrink: 0 }}>
            ⛰️ {sortedPeaks.length} cimas cercanas
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Uncaptured toggle */}
            <button
              onClick={() => setUncapturedOnly((v) => !v)}
              style={{
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                padding: "3px 8px", borderRadius: 999,
                border: `1.5px solid ${uncapturedOnly ? "#1e293b" : "#d1d5db"}`,
                background: uncapturedOnly ? "#1e293b" : "white",
                color: uncapturedOnly ? "white" : "#6b7280",
                whiteSpace: "nowrap",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              Sin subir
            </button>

            {/* Sort dropdown */}
            <div ref={sortRef} style={{ position: "relative" }}>
              <button
                onClick={() => setSortOpen((v) => !v)}
                style={{
                  fontSize: 11, color: "#6b7280", background: "none", border: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                  padding: "3px 6px", borderRadius: 6,
                }}
              >
                {sortLabels[sort]} <span style={{ fontSize: 9 }}>▾</span>
              </button>
              {sortOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", right: 0,
                  background: "white", borderRadius: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
                  border: "1px solid #e5e7eb", zIndex: 60, overflow: "hidden",
                  minWidth: 140,
                }}>
                  {(["distance", "relevance", "altitude"] as SortMode[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSort(s); setSortOpen(false); }}
                      style={{
                        display: "block", width: "100%", padding: "10px 14px",
                        fontSize: 12, fontWeight: sort === s ? 700 : 500,
                        color: "#111827", background: sort === s ? "#f3f4f6" : "none",
                        border: "none", cursor: "pointer", textAlign: "left",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >{sortLabels[s]}</button>
                  ))}
                </div>
              )}
            </div>

            {asSheet && onClose && (
              <button
                onClick={onClose}
                style={{
                  width: 24, height: 24, borderRadius: "50%", background: "#f3f4f6",
                  border: "none", cursor: "pointer", fontSize: 11, color: "#6b7280",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div ref={listRef} style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
        {visiblePeaks.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            No hay cimas con los filtros activos
          </div>
        ) : (
          visiblePeaks.map((peak) => {
            const isSelected = peak.id === selectedPeakId;
            const ascent = ascentByPeakId.get(peak.id);
            const isExpanded = isSelected && !!selectedPeak;

            // Action for expanded card
            const actionLabel = isExpanded
              ? (ascent ? "Ver captura" : "Capturar cima")
              : undefined;
            const actionVariant: "dark" | "blue" = ascent ? "dark" : "blue";
            const handleAction = isExpanded
              ? () => {
                  if (ascent) {
                    onActionView?.(`/ascents?peak=${ascent.peakId}&highlight=${ascent.ascentId}`);
                  } else {
                    onActionCapture?.(peak.id, peak.name);
                  }
                }
              : undefined;

            return (
              <div key={peak.id} ref={isSelected ? selectedCardRef : undefined}>
                <MapPeakCard
                  peak={peak}
                  ascent={ascent}
                  distanceKm={distMap.get(peak.id) ?? null}
                  selected={isSelected}
                  onClick={() => onSelectPeak(peak)}
                  expanded={isExpanded}
                  onAction={handleAction}
                  actionLabel={actionLabel}
                  actionVariant={actionVariant}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
