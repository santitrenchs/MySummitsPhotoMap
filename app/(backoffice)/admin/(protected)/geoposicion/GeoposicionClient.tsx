"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type DbPeak = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
  comarca: string | null;
  gpsVerified: boolean;
};

type ClickedPoint = {
  lng: number;
  lat: number;
  osmName: string | null;
  osmEle: number | null;
};

type ToastState = { msg: string; ok: boolean } | null;

type NominatimResult = {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  type: string;
};

// ─── Map style ────────────────────────────────────────────────────────────────

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [{ id: "carto-tiles", type: "raster", source: "carto" }],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GeoposicionClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [clickedPoint, setClickedPoint] = useState<ClickedPoint | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DbPeak[]>([]);
  const [selectedPeak, setSelectedPeak] = useState<DbPeak | null>(null);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // OSM map search (Nominatim)
  const [mapSearch, setMapSearch] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<NominatimResult[]>([]);
  const [mapSearchOpen, setMapSearchOpen] = useState(false);
  const mapSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMapSearchChange(val: string) {
    setMapSearch(val);
    setMapSearchOpen(true);
    if (mapSearchDebounce.current) clearTimeout(mapSearchDebounce.current);
    if (val.trim().length < 2) { setMapSearchResults([]); return; }
    mapSearchDebounce.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=8&featuretype=natural&addressdetails=0`;
        const res = await fetch(url, { headers: { "Accept-Language": "es,ca,en" } });
        const data: NominatimResult[] = await res.json();
        setMapSearchResults(data);
      } catch { setMapSearchResults([]); }
    }, 400);
  }

  function flyToNominatim(result: NominatimResult) {
    const map = mapRef.current;
    if (!map) return;
    setMapSearch(result.name || result.display_name);
    setMapSearchResults([]);
    setMapSearchOpen(false);
    map.flyTo({
      center: [parseFloat(result.lon), parseFloat(result.lat)],
      zoom: 13,
      duration: 1800,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });
  }

  function showToast(msg: string, ok: boolean) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  // Search our DB peaks
  const searchPeaks = useCallback((q: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (q.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/peaks?q=${encodeURIComponent(q)}&limit=10`);
        if (!res.ok) { setSearching(false); return; }
        const data = await res.json();
        setSearchResults(data.peaks ?? []);
      } catch { /* ignore */ }
      setSearching(false);
    }, 300);
  }, []);

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    setSelectedPeak(null);
    searchPeaks(val);
  }

  function closePanel() {
    setClickedPoint(null);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPeak(null);
    setSearching(false);
  }

  async function handleSave() {
    if (!clickedPoint || !selectedPeak) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/peaks/${selectedPeak.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: clickedPoint.lat,
          longitude: clickedPoint.lng,
          gpsVerified: true,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      showToast(`✓ ${selectedPeak.name} actualizada`, true);
      closePanel();
    } catch {
      showToast("Error al guardar la cima", false);
    } finally {
      setSaving(false);
    }
  }

  // Map init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [2.1734, 41.3851],
      zoom: 8,
      pitch: 0,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    const ro = new ResizeObserver(() => { map.resize(); });
    ro.observe(containerRef.current!);

    map.once("load", () => {
      map.resize();

      // Terrain + hillshade
      map.addSource("terrain-hillshade", {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 15,
      });
      map.addLayer({
        id: "hillshading",
        type: "hillshade",
        source: "terrain-hillshade",
        paint: {
          "hillshade-exaggeration": 0.7,
          "hillshade-illumination-direction": 315,
          "hillshade-illumination-anchor": "map",
          "hillshade-highlight-color": "rgba(255,255,255,0.4)",
          "hillshade-shadow-color": "rgba(0,0,0,0.55)",
        },
      });

      // OSM peaks overlay
      map.addSource("osm-peaks-source", {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution: "© OpenStreetMap contributors",
      });
      map.addLayer({
        id: "osm-peaks-dots",
        type: "circle",
        source: "osm-peaks-source",
        "source-layer": "mountain_peak",
        minzoom: 9,
        paint: {
          "circle-radius": 5,
          "circle-color": "#dc2626",
          "circle-stroke-color": "white",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "osm-peaks-labels",
        type: "symbol",
        source: "osm-peaks-source",
        "source-layer": "mountain_peak",
        minzoom: 10,
        layout: {
          "text-field": ["step", ["zoom"],
            ["get", "name"],
            12, ["concat", ["get", "name"], "\n", ["coalesce", ["get", "ele"], ""], "m"],
          ],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-offset": [0, 1.0],
          "text-anchor": "top",
          "text-optional": true,
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#7f1d1d",
          "text-halo-color": "rgba(255,255,255,0.9)",
          "text-halo-width": 1.5,
        },
      });

      // Click on OSM dot
      map.on("click", "osm-peaks-dots", (e) => {
        e.preventDefault();
        const feature = e.features?.[0];
        const props = feature?.properties ?? {};
        const ele = props.ele ? Number(props.ele) : null;
        setClickedPoint({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          osmName: props.name ?? null,
          osmEle: isNaN(ele as number) ? null : ele,
        });
        setSearchQuery(props.name ?? "");
        searchPeaks(props.name ?? "");
      });

      // Cursor pointer on hover
      map.on("mouseenter", "osm-peaks-dots", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "osm-peaks-dots", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "relative", height: "calc(100vh - 56px)", overflow: "hidden" }}>
      {/* Header bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(4px)",
        borderBottom: "1px solid #e2e8f0",
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
        <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b", flexShrink: 0 }}>Geoposición Cimas</span>

        {/* OSM map search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
          <input
            type="text"
            value={mapSearch}
            onChange={(e) => handleMapSearchChange(e.target.value)}
            onFocus={() => mapSearchResults.length > 0 && setMapSearchOpen(true)}
            onBlur={() => setTimeout(() => setMapSearchOpen(false), 150)}
            placeholder="Buscar cima en el mapa…"
            style={{
              width: "100%", padding: "6px 12px 6px 32px", fontSize: 13,
              border: "1px solid #d1d5db", borderRadius: 8,
              outline: "none", boxSizing: "border-box", background: "white",
            }}
          />
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 13, color: "#9ca3af", pointerEvents: "none",
          }}>🔍</span>
          {mapSearchOpen && mapSearchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50,
              overflow: "hidden",
            }}>
              {mapSearchResults.map((r) => (
                <button
                  key={r.place_id}
                  onMouseDown={() => flyToNominatim(r)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "8px 12px", fontSize: 12, cursor: "pointer",
                    background: "white", border: "none",
                    borderBottom: "1px solid #f3f4f6", color: "#111827",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{r.name || r.display_name.split(",")[0]}</span>
                  <span style={{ color: "#9ca3af", marginLeft: 6, fontSize: 11 }}>
                    {r.display_name.split(",").slice(1, 3).join(",").trim()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
          Clic en punto rojo → asignar coordenadas
        </span>
      </div>

      {/* Map */}
      <div ref={containerRef} style={{ width: "100%", height: "100%", paddingTop: 44 }} />

      {/* Selection panel */}
      {clickedPoint && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
          background: "white", borderTop: "1px solid #e2e8f0",
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
          padding: "20px 20px 32px",
          maxHeight: "55vh", overflowY: "auto",
        }}>
          {/* OSM info */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                  {clickedPoint.osmName ?? "Cima sin nombre"}
                  {clickedPoint.osmEle && (
                    <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 6, fontSize: 13 }}>
                      {clickedPoint.osmEle} m
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, fontFamily: "monospace" }}>
                  {clickedPoint.lat.toFixed(6)}, {clickedPoint.lng.toFixed(6)}
                </div>
              </div>
              <button
                onClick={closePanel}
                style={{
                  background: "none", border: "none", fontSize: 18,
                  cursor: "pointer", color: "#9ca3af", padding: "0 4px",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Peak search */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Asignar a cima de la base de datos
            </label>
            <div style={{ position: "relative" }}>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar cima por nombre…"
                style={{
                  width: "100%", padding: "8px 36px 8px 12px", fontSize: 14,
                  border: "1px solid #d1d5db", borderRadius: 8,
                  outline: "none", boxSizing: "border-box",
                }}
              />
              {searching && (
                <div style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  width: 16, height: 16, borderRadius: "50%",
                  border: "2px solid #d1d5db", borderTopColor: "#2563eb",
                  animation: "geo-spin 0.7s linear infinite",
                }} />
              )}
            </div>
            <style>{`@keyframes geo-spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>

            {/* Sin resultados */}
            {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && !selectedPeak && (
              <div style={{
                marginTop: 8, padding: "9px 12px",
                background: "#fffbeb", border: "1px solid #fde68a",
                borderRadius: 8, fontSize: 12, color: "#92400e",
                display: "flex", alignItems: "flex-start", gap: 7,
              }}>
                <span style={{ flexShrink: 0, fontSize: 14 }}>⚠️</span>
                <div>
                  <span style={{ fontWeight: 600 }}>Sin resultados en la base de datos</span>
                  <br />
                  Prueba con el nombre abreviado, en otro idioma o revisa la ortografía.
                </div>
              </div>
            )}
          </div>

          {/* Results list */}
          {searchResults.length > 0 && (
            <div style={{
              border: "1px solid #e5e7eb", borderRadius: 8,
              overflow: "hidden", marginBottom: 14,
            }}>
              {searchResults.map((peak) => (
                <button
                  key={peak.id}
                  onClick={() => { setSelectedPeak(peak); setSearchQuery(peak.name); setSearchResults([]); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 14px", fontSize: 13, cursor: "pointer",
                    background: selectedPeak?.id === peak.id ? "#eff6ff" : "white",
                    border: "none",
                    borderBottom: "1px solid #f3f4f6",
                    color: "#111827",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{peak.name}</span>
                  <span style={{ color: "#6b7280", marginLeft: 6 }}>{peak.altitudeM} m</span>
                  {peak.mountainRange && (
                    <span style={{ color: "#9ca3af", marginLeft: 6, fontSize: 12 }}>· {peak.mountainRange}</span>
                  )}
                  {peak.gpsVerified && (
                    <span style={{ color: "#16a34a", marginLeft: 6, fontSize: 11 }}>✓ Verificada</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Selected summary */}
          {selectedPeak && searchResults.length === 0 && (
            <div style={{
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 8, padding: "10px 14px", marginBottom: 14,
              fontSize: 13, color: "#166534",
            }}>
              <strong>{selectedPeak.name}</strong> — {selectedPeak.altitudeM} m
              {selectedPeak.mountainRange && ` · ${selectedPeak.mountainRange}`}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={closePanel}
              style={{
                flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 500,
                background: "white", border: "1px solid #d1d5db",
                borderRadius: 8, cursor: "pointer", color: "#374151",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedPeak || saving}
              style={{
                flex: 2, padding: "10px 0", fontSize: 14, fontWeight: 600,
                background: selectedPeak && !saving ? "#2563eb" : "#93c5fd",
                border: "none", borderRadius: 8,
                cursor: selectedPeak && !saving ? "pointer" : "not-allowed",
                color: "white",
              }}
            >
              {saving ? "Guardando…" : "Guardar coordenadas"}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "absolute", bottom: clickedPoint ? "calc(55vh + 16px)" : 24,
          left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? "#166534" : "#991b1b",
          color: "white", borderRadius: 24,
          padding: "10px 20px", fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          zIndex: 30, whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
