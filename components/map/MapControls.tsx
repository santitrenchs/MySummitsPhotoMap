"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface MapControlsProps {
  isMobile: boolean;
  hillshade: boolean;
  onHillshadeToggle: () => void;
  terrain3d: boolean;
  onTerrain3dToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onGeolocate: (lat: number, lng: number) => void;
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

export default function MapControls({
  isMobile,
  hillshade, onHillshadeToggle,
  terrain3d, onTerrain3dToggle,
  onZoomIn, onZoomOut,
  onGeolocate,
}: MapControlsProps) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [geoErrorMsg, setGeoErrorMsg] = useState<string | null>(null);
  const [geoBtnPos, setGeoBtnPos] = useState<{ top: number; left: number } | null>(null);
  const layersBtnRef = useRef<HTMLButtonElement>(null);
  const geoBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openLayers() {
    if (!layersBtnRef.current) return;
    const r = layersBtnRef.current.getBoundingClientRect();
    setMenuPos({ top: r.top, left: r.left - 160 });
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
      showGeoError("Tu navegador no soporta geolocalización.");
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
          ? `Permite el acceso a tu ubicación en Ajustes > ${browserName} > Ubicación.`
          : "Permite el acceso a tu ubicación en los ajustes del navegador.";
        showGeoError(msg);
      } else {
        showGeoError("No se pudo obtener tu ubicación.");
      }
    };

    if (isMobile) {
      // Mobile: try GPS first, fall back to network triangulation
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
      // Desktop: go straight to network-based location (no GPS hardware)
      navigator.geolocation.getCurrentPosition(onSuccess, onError,
        { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 });
    }
  }

  // Desktop: right of map, left of sidebar (right: 344px)
  // Mobile: bottom-right where zoom buttons used to be
  const containerStyle: React.CSSProperties = isMobile
    ? { position: "absolute", right: 12, bottom: 100, zIndex: 10, display: "flex", flexDirection: "column", gap: 8 }
    : { position: "absolute", right: 344, bottom: 80, zIndex: 10, display: "flex", flexDirection: "column", gap: 8 };

  const geoColor = geoState === "error" ? "#dc2626" : geoState === "locating" ? "#0369a1" : "#1e293b";

  return (
    <>
      <div style={containerStyle}>
        {/* Layers */}
        <button
          ref={layersBtnRef}
          style={BTN(layersOpen)}
          onClick={() => layersOpen ? setLayersOpen(false) : openLayers()}
          aria-label="Capas"
          title="Capas"
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
            <button style={BTN()} onClick={onZoomIn} aria-label="Acercar" title="Acercar">
              <span style={{ fontSize: 22, fontWeight: 300, lineHeight: 1 }}>+</span>
            </button>
            <button style={BTN()} onClick={onZoomOut} aria-label="Alejar" title="Alejar">
              <span style={{ fontSize: 22, fontWeight: 300, lineHeight: 1 }}>−</span>
            </button>
          </>
        )}

        {/* Geolocate */}
        <button
          ref={geoBtnRef}
          style={{ ...BTN(), color: geoColor }}
          onClick={handleGeolocate}
          aria-label="Mi ubicación"
          title="Mi ubicación"
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
          borderRadius: 10,
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

      {/* Layers popup */}
      {layersOpen && menuPos && createPortal(
        <div ref={menuRef} style={{
          position: "fixed", top: menuPos.top, left: menuPos.left,
          background: "white", borderRadius: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          border: "1px solid #e5e7eb",
          zIndex: 9999, minWidth: 150, overflow: "hidden",
        }}>
          {[
            { label: "Normal", active: !hillshade },
            { label: "Relieve", active: hillshade },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => { if (!opt.active) onHillshadeToggle(); setLayersOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "11px 16px",
                background: opt.active ? "#f3f4f6" : "none",
                border: "none", borderBottom: "1px solid #f3f4f6",
                cursor: "pointer", textAlign: "left",
                fontSize: 13, fontWeight: opt.active ? 700 : 500,
                color: "#111827",
              }}
            >
              {opt.active && <span style={{ fontSize: 11 }}>✓</span>}
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
