"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { MapPeak, AscentMapEntry, MapBounds } from "./MapView";
import MapPeakCard from "./MapPeakCard";

type Filter = "all" | "climbed" | "not-climbed";
type SortMode = "distance" | "altitude" | "rarity";

interface Props {
  peaks: MapPeak[];
  ascentByPeakId: Map<string, AscentMapEntry>;
  mapBounds: MapBounds | null;
  filter: Filter;
  rarityFilter: string[];
  mythicOnly: boolean;
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
  filter, rarityFilter, mythicOnly,
  selectedPeakId, onSelectPeak,
  asSheet = false, onClose,
}: Props) {
  const [sort, setSort] = useState<SortMode>("distance");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

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

  const visiblePeaks = useMemo(() => {
    const activeRarity = mythicOnly ? ["mythic"] : rarityFilter;
    return peaks.filter((p) => {
      // Status filter
      const hasAscent = ascentByPeakId.has(p.id);
      if (filter === "climbed" && !hasAscent) return false;
      if (filter === "not-climbed" && hasAscent) return false;
      // Rarity filter
      if (activeRarity.length > 0 && !activeRarity.includes(p.rarityId ?? "")) return false;
      // Bounds filter
      if (mapBounds) {
        if (p.latitude < mapBounds.south || p.latitude > mapBounds.north) return false;
        if (p.longitude < mapBounds.west || p.longitude > mapBounds.east) return false;
      }
      return true;
    });
  }, [peaks, ascentByPeakId, filter, rarityFilter, mythicOnly, mapBounds]);

  const sortedPeaks = useMemo(() => {
    return [...visiblePeaks].sort((a, b) => {
      if (sort === "altitude") return b.altitudeM - a.altitudeM;
      if (sort === "rarity") return (a.rarity?.order ?? 99) - (b.rarity?.order ?? 99);
      // distance from map center
      if (centerLat === null || centerLng === null) return 0;
      const da = distKm(centerLat, centerLng, a.latitude, a.longitude);
      const db = distKm(centerLat, centerLng, b.latitude, b.longitude);
      return da - db;
    });
  }, [visiblePeaks, sort, centerLat, centerLng]);

  const sortLabels: Record<SortMode, string> = {
    distance: "Más cercanas",
    altitude: "Mayor altitud",
    rarity:   "Rareza",
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
        width: 320, flexShrink: 0,
        display: "flex", flexDirection: "column",
        borderLeft: "1px solid #e5e7eb",
        background: "#fafafa",
        overflowY: "auto",
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>
            ⛰️ {sortedPeaks.length} cima{sortedPeaks.length !== 1 ? "s" : ""} en esta zona
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  {(["distance", "altitude", "rarity"] as SortMode[]).map((s) => (
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
      <div style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
        {sortedPeaks.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            No hay cimas en esta zona con los filtros activos
          </div>
        ) : (
          sortedPeaks.map((peak) => (
            <MapPeakCard
              key={peak.id}
              peak={peak}
              ascent={ascentByPeakId.get(peak.id)}
              distanceKm={centerLat !== null && centerLng !== null
                ? distKm(centerLat, centerLng, peak.latitude, peak.longitude)
                : null}
              selected={peak.id === selectedPeakId}
              onClick={() => onSelectPeak(peak)}
            />
          ))
        )}
      </div>
    </div>
  );
}
