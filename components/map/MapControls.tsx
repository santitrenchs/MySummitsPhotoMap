"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type maplibregl from "maplibre-gl";
import type { Dict } from "@/lib/i18n/types";
import { i } from "@/lib/i18n";
import { useT } from "@/components/providers/I18nProvider";

/**
 * The three mutually exclusive basemaps, mirroring Android's `MapType` enum.
 * Exported so `MapView` types its state from the same definition.
 */
export type MapType = "normal" | "terrain" | "satellite";

interface MapControlsProps {
  isMobile: boolean;
  /** Null until the map finishes initialising; the compass subscribes to it. */
  map: maplibregl.Map | null;
  mapType: MapType;
  onMapTypeChange: (type: MapType) => void;
  terrain3d: boolean;
  onTerrain3dToggle: () => void;
  trails: boolean;
  onTrailsToggle: () => void;
  huts: boolean;
  onHutsToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onGeolocate: (lat: number, lng: number) => void;
  topBarVisible?: boolean;
  onTopBarToggle?: () => void;
}

type GeoState = "idle" | "locating" | "error";

const BTN = (active = false): React.CSSProperties => ({
  width: 44, height: 44, borderRadius: "50%",
  background: active ? "#1e293b" : "white",
  color: active ? "white" : "#1e293b",
  border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  fontSize: 18, fontWeight: 600,
  flexShrink: 0,
  transition: "background 0.15s, color 0.15s",
});

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-inter, sans-serif)",
  fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
  color: "#9ca3af", textTransform: "uppercase",
  margin: "0 0 10px",
};

function LayerCard({
  label, active, onClick, icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        padding: "10px 8px 8px",
        borderRadius: "var(--radius-md)",
        border: `2px solid ${active ? "#0369a1" : "#e5e7eb"}`,
        background: active ? "#eff6ff" : "#f9fafb",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        position: "relative",
      }}
    >
      {/* Active checkmark */}
      {active && (
        <div style={{
          position: "absolute", top: 5, right: 5,
          width: 14, height: 14, borderRadius: "50%",
          background: "#0369a1",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      {/* Icon area */}
      <div style={{
        width: 44, height: 36,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "var(--radius-sm)",
        background: active ? "rgba(3,105,161,0.1)" : "rgba(0,0,0,0.04)",
        color: active ? "#0369a1" : "#6b7280",
        transition: "background 0.15s, color 0.15s",
      }}>
        {icon}
      </div>
      <span style={{
        fontSize: 11, fontWeight: active ? 700 : 500,
        color: active ? "#0369a1" : "#374151",
        lineHeight: 1, whiteSpace: "nowrap",
      }}>
        {label}
      </span>
    </button>
  );
}

/**
 * Compass / reset-north button.
 *
 * It subscribes to the map's own "rotate" event instead of taking the bearing as a
 * prop: the needle has to follow the gesture frame by frame, and lifting that state
 * into MapView would re-render the whole Atlas on every degree.
 *
 * It is ALWAYS visible, unlike Google's and Apple's, which only appear once you are
 * rotated. Those are consumer navigation maps where the compass is an undo button.
 * This is a topographic map — it already draws a scale bar, and in cartography the
 * north arrow is the scale bar's twin: both are map furniture, not controls. Outdoor
 * maps (Gaia, CalTopo, OS Maps) all keep it on screen, and so does MapLibre's own
 * NavigationControl.
 *
 * The rose carries an explicit "N" that orbits with the bearing, so it marks where
 * north actually fell instead of relying on the reader knowing that red means north.
 */
function CompassButton({ map, t }: { map: maplibregl.Map; t: Dict }) {
  const [bearing, setBearing] = useState(() => map.getBearing());

  useEffect(() => {
    const sync = () => setBearing(map.getBearing());
    sync();
    map.on("rotate", sync);
    return () => { map.off("rotate", sync); };
  }, [map]);

  // Normalise to (-180, 180] so a bearing of 359.6° reads as "straight", not as
  // 359.6° off north.
  const norm = ((bearing % 360) + 360) % 360;
  const off = norm > 180 ? norm - 360 : norm;
  const atNorth = Math.abs(off) < 0.5;

  return (
    <button
      style={BTN()}
      onClick={() => { if (!atNorth) map.easeTo({ bearing: 0, duration: 420 }); }}
      aria-label={atNorth ? t.map_facingNorth : t.map_north}
      title={atNorth ? t.map_facingNorth : t.map_north}
    >
      {/* Everything counter-rotates the map's bearing, so the needle and the "N"
          keep pointing at true north. */}
      <svg
        width="28" height="28" viewBox="0 0 24 24" fill="none"
        style={{ transform: `rotate(${-bearing}deg)` }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="11.2" stroke="#E6EBF0" strokeWidth="1" />
        <text
          x="12" y="4.9" textAnchor="middle"
          fontSize="7" fontWeight="800" fill="#334155"
          fontFamily="var(--font-inter, sans-serif)"
        >N</text>
        {/* Double dart centred on (12,12) so it spins on its own axis. Each half is
            split into two facets to read as a needle rather than a flat triangle. */}
        <path d="M12 7 L14.4 12 L12 10.6 Z" fill="#EF4444" />
        <path d="M12 7 L9.6 12 L12 10.6 Z" fill="#DC2626" />
        <path d="M12 17 L9.6 12 L12 13.4 Z" fill="#94A3B8" />
        <path d="M12 17 L14.4 12 L12 13.4 Z" fill="#CBD5E1" />
      </svg>
    </button>
  );
}

export default function MapControls({
  isMobile,
  map,
  mapType, onMapTypeChange,
  terrain3d, onTerrain3dToggle,
  trails, onTrailsToggle,
  huts, onHutsToggle,
  onZoomIn, onZoomOut,
  onGeolocate,
  topBarVisible, onTopBarToggle,
}: MapControlsProps) {
  const t = useT();
  const [layersOpen, setLayersOpen] = useState(false);
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [geoErrorMsg, setGeoErrorMsg] = useState<string | null>(null);
  const [geoBtnPos, setGeoBtnPos] = useState<{ top: number; left: number } | null>(null);
  const layersBtnRef = useRef<HTMLButtonElement>(null);
  const geoBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Layers button is "active" when any non-default layer is on
  const hasActiveLayers = mapType !== "normal" || trails || huts;

  function openLayers() {
    if (!layersBtnRef.current) return;
    const r = layersBtnRef.current.getBoundingClientRect();
    setMenuPos({ top: r.top, left: r.left - 220 });
    setLayersOpen(true);
  }

  useEffect(() => {
    if (!layersOpen) return;
    const handler = (e: MouseEvent) => {
      if (layersBtnRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setLayersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [layersOpen]);

  function showGeoError(msg: string) {
    if (!geoBtnRef.current) return;
    const r = geoBtnRef.current.getBoundingClientRect();
    setGeoBtnPos({ top: r.top, left: r.left });
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setGeoErrorMsg(msg);
    errorTimerRef.current = setTimeout(() => setGeoErrorMsg(null), 5000);
  }

  function handleGeolocate() {
    if (geoState === "locating") return;
    if (!navigator.geolocation) {
      setGeoState("error");
      showGeoError(t.map_geoUnsupported);
      return;
    }
    setGeoState("locating");
    setGeoErrorMsg(null);

    const onSuccess = (pos: GeolocationPosition) => {
      setGeoState("idle");
      onGeolocate(pos.coords.latitude, pos.coords.longitude);
    };

    const onError = (err: GeolocationPositionError) => {
      setGeoState("error");
      if (err.code === 1) {
        const ua = navigator.userAgent;
        const browserName = /CriOS/.test(ua) ? "Chrome"
          : /FxiOS/.test(ua) ? "Firefox"
          : /EdgiOS/.test(ua) ? "Edge"
          : /Safari/.test(ua) ? "Safari"
          : null;
        const msg = browserName
          ? i(t.map_geoDeniedIn, { browser: browserName })
          : t.map_geoDenied;
        showGeoError(msg);
      } else {
        showGeoError(t.map_geoFailed);
      }
    };

    if (isMobile) {
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        (err) => {
          if (err.code === 1) { onError(err); return; }
          navigator.geolocation.getCurrentPosition(onSuccess, onError,
            { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 });
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError,
        { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 });
    }
  }

  const containerStyle: React.CSSProperties = isMobile
    ? { position: "absolute", right: 12, bottom: 100, zIndex: 10, display: "flex", flexDirection: "column", gap: 8 }
    : { position: "absolute", right: "calc(var(--sidebar-w, 320px) + 24px)" as unknown as number, bottom: 80, zIndex: 10, display: "flex", flexDirection: "column", gap: 8 };

  const geoColor = geoState === "error" ? "#dc2626" : geoState === "locating" ? "#0369a1" : "#1e293b";

  return (
    <>
      <div style={containerStyle}>
        {/* Search/filter bar toggle — mobile only */}
        {isMobile && onTopBarToggle !== undefined && (
          <button
            style={BTN(!topBarVisible)}
            onClick={onTopBarToggle}
            aria-label={topBarVisible ? t.map_hideSearch : t.map_showSearch}
            title={topBarVisible ? t.map_hideSearch : t.map_showSearch}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              {!topBarVisible && <line x1="5" y1="17" x2="17" y2="5" stroke="currentColor" strokeWidth="2.2" />}
            </svg>
          </button>
        )}

        {/* Compass — first in the column: orientation is context you read before
            you reach for a control, not an action. */}
        {map && <CompassButton map={map} t={t} />}

        {/* Layers */}
        <button
          ref={layersBtnRef}
          style={BTN(layersOpen || hasActiveLayers)}
          onClick={() => layersOpen ? setLayersOpen(false) : openLayers()}
          aria-label={t.map_layers}
          title={t.map_layers}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </button>

        {/* 3D */}
        <button
          style={BTN(terrain3d)}
          onClick={onTerrain3dToggle}
          aria-label="3D"
          title="3D"
        >
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.5px" }}>3D</span>
        </button>

        {/* Zoom — desktop only */}
        {!isMobile && (
          <>
            <button style={BTN()} onClick={onZoomIn} aria-label={t.map_zoomIn} title={t.map_zoomIn}>
              <span style={{ fontSize: 22, fontWeight: 300, lineHeight: 1 }}>+</span>
            </button>
            <button style={BTN()} onClick={onZoomOut} aria-label={t.map_zoomOut} title={t.map_zoomOut}>
              <span style={{ fontSize: 22, fontWeight: 300, lineHeight: 1 }}>−</span>
            </button>
          </>
        )}

        {/* Geolocate */}
        <button
          ref={geoBtnRef}
          style={{ ...BTN(), color: geoColor }}
          onClick={handleGeolocate}
          aria-label={t.map_myLocation}
          title={t.map_myLocation}
        >
          {geoState === "locating" ? (
            <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #bfdbfe", borderTopColor: "#0369a1", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          )}
        </button>
      </div>

      {/* Geo error tooltip */}
      {geoErrorMsg && geoBtnPos && createPortal(
        <div style={{
          position: "fixed",
          top: geoBtnPos.top + 8,
          right: window.innerWidth - geoBtnPos.left + 8,
          background: "white",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
          border: "1px solid #fecaca",
          padding: "8px 12px",
          fontSize: 13,
          color: "#dc2626",
          zIndex: 9999,
          maxWidth: 220,
          lineHeight: 1.4,
          pointerEvents: "none",
        }}>
          {geoErrorMsg}
        </div>,
        document.body
      )}

      {/* Layers panel — card grid */}
      {layersOpen && menuPos && createPortal(
        <div ref={menuRef} style={{
          position: "fixed", top: menuPos.top, left: menuPos.left,
          background: "white", borderRadius: "var(--radius-lg)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.16)",
          border: "1px solid #e5e7eb",
          // 248, not 212: the map-type row went from two cards to three, and at
          // the old width each card was narrower than its own 44px icon box.
          zIndex: 9999, width: 248,
          padding: "16px 14px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>

          {/* Tipo de mapa */}
          <div>
            <p style={sectionLabel}>{t.map_mapType}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <LayerCard
                label={t.map_layerNormal}
                active={mapType === "normal"}
                onClick={() => onMapTypeChange("normal")}
                icon={
                  <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
                    <rect x="1" y="1" width="24" height="20" rx="3" fill="currentColor" opacity="0.12"/>
                    <rect x="1" y="1" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="1" y1="8" x2="25" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
                    <line x1="1" y1="14" x2="25" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
                    <line x1="9" y1="1" x2="9" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
                    <line x1="17" y1="1" x2="17" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
                  </svg>
                }
              />
              <LayerCard
                label={t.map_layerRelief}
                active={mapType === "terrain"}
                onClick={() => onMapTypeChange("terrain")}
                icon={
                  <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
                    <path d="M1 18 L8 8 L13 13 L18 5 L25 18 Z" fill="currentColor" opacity="0.2"/>
                    <path d="M1 18 L8 8 L13 13 L18 5 L25 18" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
                    <path d="M16 5 L18 5 L20 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
                  </svg>
                }
              />
              <LayerCard
                label={t.map_layerSatellite}
                active={mapType === "satellite"}
                onClick={() => onMapTypeChange("satellite")}
                icon={
                  /* Globe framed in a rounded square — the same shape Android's
                     SatelliteIcon uses, so the two panels read as one product. */
                  <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
                    <rect x="1" y="1" width="24" height="20" rx="4" fill="currentColor" opacity="0.15"/>
                    <rect x="1" y="1" width="24" height="20" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="13" y1="1" x2="13" y2="21" stroke="currentColor" strokeWidth="1.2" opacity="0.55"/>
                    <line x1="1" y1="11" x2="25" y2="11" stroke="currentColor" strokeWidth="1.2" opacity="0.55"/>
                  </svg>
                }
              />
            </div>
          </div>

          {/* Capas */}
          <div>
            <p style={sectionLabel}>{t.map_layers}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <LayerCard
                label={t.map_layerTrails}
                active={trails}
                onClick={onTrailsToggle}
                icon={
                  <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
                    <path d="M2 19 Q7 14 10 11 Q13 8 16 10 Q19 12 24 5"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      strokeDasharray="3 2.5" fill="none"/>
                  </svg>
                }
              />
              <LayerCard
                label={t.map_layerHuts}
                active={huts}
                onClick={onHutsToggle}
                icon={
                  <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
                    <path d="M13 3 L23 10 L21 10 L21 19 L5 19 L5 10 L3 10 Z"
                      fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <rect x="10" y="12" width="6" height="7" rx="1"
                      fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.2"/>
                    <circle cx="20" cy="5" r="2.5" fill="#f59e0b" stroke="white" strokeWidth="1.2"/>
                  </svg>
                }
              />
            </div>
          </div>

        </div>,
        document.body
      )}
    </>
  );
}
