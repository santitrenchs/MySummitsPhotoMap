"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MapPeak = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  mountainRange: string | null;
  country: string;
};

export type AscentMapEntry = {
  peakId: string;
  ascentId: string;
  photoUrl: string | null;
  date: string;
  route: string | null;
  ascentCount: number;
};

type Filter = "all" | "climbed" | "not-climbed";
type Tooltip = { text: string; x: number; y: number } | null;
type Selected = { peak: MapPeak; ascent: AscentMapEntry | null } | null;

// ─── Map tile style ───────────────────────────────────────────────────────────

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

// ─── Mountain placeholder (panel) ────────────────────────────────────────────

function PanelPlaceholder() {
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="ph-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="ph-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#ph-sky)" />
      <polygon points="0,160 300,160 300,200 0,200" fill="#4ade80" opacity="0.4" />
      <polygon points="150,18 250,140 50,140" fill="url(#ph-rock)" />
      <polygon points="150,18 178,68 150,62 122,68" fill="white" opacity="0.88" />
      <polygon points="230,40 295,130 165,130" fill="#b0bec5" opacity="0.65" />
      <rect x="0" y="158" width="300" height="42" fill="#86efac" opacity="0.35" />
      <polygon points="20,158 38,128 56,158" fill="#16a34a" opacity="0.7" />
      <polygon points="248,158 266,130 284,158" fill="#16a34a" opacity="0.7" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapView({
  peaks,
  ascentData = [],
}: {
  peaks: MapPeak[];
  ascentData?: AscentMapEntry[];
}) {
  const router = useRouter();
  const t = useT();
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ascentByPeakId = useRef(new Map(ascentData.map((a) => [a.peakId, a])));
  const markerEls = useRef(new Map<string, HTMLElement>());
  const justSelectedRef = useRef(false);

  const [selected, setSelected] = useState<Selected>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [hillshade, setHillshade] = useState(true);
  const [terrain3d, setTerrain3d] = useState(() => window.innerWidth >= 640);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  function navigate(href: string) {
    if (navigatingTo) return;
    setNavigatingTo(href);
    router.push(href);
  }

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Search results — filter peaks by name
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return peaks
      .filter((p) => p.name.toLowerCase().includes(q) || (p.mountainRange ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, peaks]);

  // Fly to peak with cinematic 3D tour
  function flyToPeak(peak: MapPeak) {
    const map = mapRef.current;
    if (!map) return;

    setSearchQuery("");
    setSearchOpen(false);

    const ascent = ascentByPeakId.current.get(peak.id) ?? null;
    setSelected({ peak, ascent });
    justSelectedRef.current = true;

    map.flyTo({
      center: [peak.longitude, peak.latitude],
      zoom: 13,
      pitch: terrain3d ? 65 : 0,
      bearing: 20,
      duration: 2200,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      easing: (t: number) => 1 - Math.pow(1 - t, 3), // ease-out cubic
    });
  }

  // Apply filter
  useEffect(() => {
    const showAscended = filter !== "not-climbed";
    const showUnascended = filter !== "climbed";
    markerEls.current.forEach((el) => { el.style.display = showAscended ? "block" : "none"; });
    const map = mapRef.current;
    if (map) {
      for (const layer of ["clusters", "cluster-count", "unclustered-peaks", "peak-labels"]) {
        if (map.getLayer(layer)) {
          map.setLayoutProperty(layer, "visibility", showUnascended ? "visible" : "none");
        }
      }
    }
  }, [filter]);

  // Clear selection if hidden by filter
  useEffect(() => {
    if (!selected) return;
    const isAscended = ascentByPeakId.current.has(selected.peak.id);
    if (filter === "not-climbed" && isAscended) setSelected(null);
    if (filter === "climbed" && !isAscended) setSelected(null);
  }, [filter, selected]);

  // Hillshade toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("hillshading")) return;
    map.setLayoutProperty("hillshading", "visibility", hillshade ? "visible" : "none");
  }, [hillshade]);

  // Terrain 3D toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) return;
    try {
      if (terrain3d) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).setTerrain({ source: "terrain", exaggeration: 1.5 });
        map.easeTo({ pitch: 45, duration: 600 });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).setTerrain(null);
        map.easeTo({ pitch: 0, duration: 600 });
      }
    } catch { /* terrain not ready yet */ }
  }, [terrain3d]);

  // Fly to GPS position when LocationPrompt grants permission
  useEffect(() => {
    function onGpsAcquired(e: Event) {
      const map = mapRef.current;
      if (!map) return;
      const { lat, lon } = (e as CustomEvent<{ lat: number; lon: number }>).detail;
      map.flyTo({ center: [lon, lat], zoom: 9, duration: 1800 });
    }
    window.addEventListener("azitracks:gps-acquired", onGpsAcquired);
    return () => window.removeEventListener("azitracks:gps-acquired", onGpsAcquired);
  }, []);

  // Map initialisation (runs once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initMobile = window.innerWidth < 640;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [0.5, 42.75],
      zoom: 8,
      pitch: initMobile ? 0 : 45,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("click", () => {
      if (justSelectedRef.current) { justSelectedRef.current = false; return; }
      setSelected(null);
    });

    // Resize map whenever the container changes size (fixes client-side
    // navigation timing: CSS vars may settle after map init, and the single
    // map.resize() inside map.once("load") fires too early on mobile).
    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize();
    });
    ro.observe(containerRef.current);

    map.once("load", () => {
      map.resize();

      // ── Terrain source + 3D + hillshade ────────────────────────────────
      map.addSource("terrain", {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 15,
      });

      // Enable 3D terrain by default (desktop only — mobile starts flat)
      if (!initMobile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).setTerrain({ source: "terrain", exaggeration: 1.5 });
      }

      map.addLayer({
        id: "hillshading",
        type: "hillshade",
        source: "terrain",
        paint: {
          "hillshade-exaggeration": 0.7,
          "hillshade-illumination-direction": 315,
          "hillshade-illumination-anchor": "map",
          "hillshade-highlight-color": "rgba(255,255,255,0.4)",
          "hillshade-shadow-color": "rgba(0,0,0,0.55)",
        },
      });

      // ── GeoJSON source for unascended peaks ─────────────────────────────
      const unascentedFeatures = peaks
        .filter((p) => !ascentByPeakId.current.has(p.id))
        .map((p) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] },
          properties: { id: p.id, name: p.name, alt: p.altitudeM },
        }));

      map.addSource("unascended-peaks", {
        type: "geojson",
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 55,
        data: { type: "FeatureCollection", features: unascentedFeatures },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "unascended-peaks",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#60a5fa", 5, "#3b82f6", 15, "#1d4ed8"],
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 15, 28],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "white",
          "circle-opacity": 0.92,
          "circle-pitch-alignment": "map",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "unascended-peaks",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
        },
        paint: { "text-color": "white" },
      });

      map.addLayer({
        id: "unclustered-peaks",
        type: "circle",
        source: "unascended-peaks",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#60a5fa",
          "circle-radius": 7,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "white",
          "circle-opacity": 0.9,
          "circle-pitch-alignment": "map",
        },
      });

      map.addLayer({
        id: "peak-labels",
        type: "symbol",
        source: "unascended-peaks",
        filter: ["!", ["has", "point_count"]],
        minzoom: 10,
        layout: {
          "text-field": ["concat", ["get", "name"], "\n", ["to-string", ["get", "alt"]], " m"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-optional": true,
          "text-allow-overlap": false,
          "text-max-width": 9,
        },
        paint: {
          "text-color": "#374151",
          "text-halo-color": "rgba(255,255,255,0.92)",
          "text-halo-width": 1.5,
        },
      });

      map.on("click", "clusters", (e) => {
        justSelectedRef.current = true;
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId == null) return;
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        const src = map.getSource("unascended-peaks") as maplibregl.GeoJSONSource;
        Promise.resolve(src.getClusterExpansionZoom(clusterId)).then((zoom) => {
          if (typeof zoom === "number") map.easeTo({ center: coords, zoom, duration: 500 });
        });
      });

      map.on("click", "unclustered-peaks", (e) => {
        justSelectedRef.current = true;
        const props = e.features?.[0]?.properties;
        if (!props) return;
        const peak = peaks.find((p) => p.id === props.id);
        if (peak) setSelected({ peak, ascent: null });
      });

      map.on("mousemove", "unclustered-peaks", (e) => {
        const props = e.features?.[0]?.properties;
        if (!props || !containerRef.current) return;
        const pt = map.project(e.lngLat);
        setTooltip({ text: `${props.name} · ${Number(props.alt).toLocaleString(tRef.current.dateLocale)} m`, x: pt.x, y: pt.y });
      });
      map.on("mouseleave", "unclustered-peaks", () => setTooltip(null));

      map.on("mousemove", "clusters", (e) => {
        const props = e.features?.[0]?.properties;
        if (!props || !containerRef.current) return;
        const pt = map.project(e.lngLat);
        setTooltip({ text: i(tRef.current.map_unclimbedPeaks, { n: props.point_count }), x: pt.x, y: pt.y });
      });
      map.on("mouseleave", "clusters", () => setTooltip(null));

      for (const layer of ["clusters", "unclustered-peaks"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }

      // ── Ascended peaks: circular photo HTML markers ─────────────────────
      for (const entry of ascentData) {
        const peak = peaks.find((p) => p.id === entry.peakId);
        if (!peak) continue;

        const RING = "0 0 0 2.5px #22c55e, 0 3px 14px rgba(0,0,0,0.28)";
        const RING_HOVER = "0 0 0 4px #22c55e, 0 5px 20px rgba(0,0,0,0.36)";

        const el = document.createElement("div");
        el.setAttribute("aria-label", `${peak.name} ${peak.altitudeM}m (climbed)`);
        el.style.cssText = [
          "position:absolute",  // explicit — maplibre-gl.css may not apply on iOS Safari
          "width:42px", "height:42px", "border-radius:50%",
          "overflow:hidden", "cursor:pointer",
          "border:2.5px solid white",
          `box-shadow:${RING}`,
          "transition:box-shadow 0.2s ease",
          "background-color:#dbeafe",
          entry.photoUrl ? `background-image:url(${entry.photoUrl})` : "",
          "background-size:cover", "background-position:center",
        ].filter(Boolean).join(";");

        if (!entry.photoUrl) {
          el.style.background = "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.fontSize = "14px";
          el.style.fontWeight = "700";
          el.style.color = "#0369a1";
          el.style.fontFamily = "system-ui, -apple-system, sans-serif";
          el.textContent = peak.name[0]?.toUpperCase() ?? "?";
        }

        el.addEventListener("mouseenter", () => { el.style.boxShadow = RING_HOVER; });
        el.addEventListener("mousemove", (e) => {
          if (!containerRef.current) return;
          const me = e as MouseEvent;
          const cRect = containerRef.current.getBoundingClientRect();
          setTooltip({
            text: `${peak.name} · ${peak.altitudeM.toLocaleString(tRef.current.dateLocale)} m`,
            x: me.clientX - cRect.left,
            y: me.clientY - cRect.top,
          });
        });
        el.addEventListener("mouseleave", () => { el.style.boxShadow = RING; setTooltip(null); });
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          justSelectedRef.current = true;
          setSelected({ peak, ascent: entry });
        });

        markerEls.current.set(peak.id, el);
        new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([peak.longitude, peak.latitude])
          .addTo(map);
      }

      // Force marker positions to recalculate after the map has fully
      // rendered. map.resize() at the top of this handler fires before
      // the canvas has its final CSS size on iOS Safari, causing all
      // HTML markers to be offset downward by exactly the canvas height.
      // 'idle' fires after the first complete render, guaranteeing layout
      // is settled — more reliable than rAF on iOS Safari.
      map.once("idle", () => {
        map.resize();
      });
    });

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markerEls.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived counts ────────────────────────────────────────────────────────
  const climbedCount = ascentData.length;
const panelStyle: React.CSSProperties = isMobile
    ? { bottom: 0, left: 0, right: 0, borderRadius: "20px 20px 0 0", maxHeight: "70vh" }
    : { top: 12, right: 12, width: 300, maxHeight: "calc(100% - 80px)", borderRadius: 18 };

  return (
    <div style={{ position: "relative", height: "calc(100svh - var(--top-nav-h, 3.5rem) - var(--bottom-nav-h, 0px))", background: "#e2e8f0" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes panelInMobile {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes searchDrop {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .map-panel { animation: panelIn 0.22s ease both; }
        .map-panel-mobile { animation: panelInMobile 0.28s ease both; }
        /* iOS Safari: maplibre-gl.css position:absolute not always applied
           to dynamically created markers — set it explicitly. */
        .maplibregl-marker { position: absolute !important; z-index: 1; }
        .filter-chip { transition: background 0.15s, color 0.15s, box-shadow 0.15s; }
        .filter-chip:active { transform: scale(0.95); }
        .panel-action-btn { transition: opacity 0.15s, transform 0.15s; }
        .panel-action-btn:hover { opacity: 0.88; transform: scale(0.98); }
        .search-result:hover { background: #f3f4f6; }
      `}</style>

      {/* Map canvas */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* ── Unified search + filter panel ── top ──────────────────────── */}
      <div style={{
        position: "absolute", top: 12,
        left: 12, right: 12,
        ...(isMobile ? {} : { right: "auto", width: 380 }),
        zIndex: 20,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderRadius: 16,
        boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
        overflow: "hidden",
      }}>
        {/* Row 1: Search input */}
        <div style={{ position: "relative", padding: "10px 12px 8px" }}>
          <span style={{
            position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)",
            fontSize: 14, pointerEvents: "none", color: "#9ca3af",
          }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            placeholder="Buscar cima…"
            style={{
              width: "100%", padding: "8px 30px 8px 32px",
              borderRadius: 10, border: "none",
              fontSize: 16, fontWeight: 500, color: "#111827",
              background: "#f3f4f6",
              outline: "none", boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button
              onMouseDown={() => setSearchQuery("")}
              style={{
                position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: 2,
              }}
            >✕</button>
          )}
        </div>

        {/* Row 2: Filter chips + toggles */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "0 10px 10px",
          borderTop: "1px solid #f3f4f6",
          paddingTop: 8,
        }}>
          <div style={{ display: "flex", gap: 5, flex: 1, minWidth: 0, flexWrap: "nowrap", overflow: "hidden" }}>
            {[
              { value: "all" as Filter,         label: `${t.map_all} ${peaks.length}` },
              { value: "climbed" as Filter,      label: `✓ ${climbedCount}` },
              { value: "not-climbed" as Filter,  label: `○ ${peaks.length - climbedCount}` },
            ].map(({ value, label }) => (
              <button
                key={value}
                className="filter-chip"
                onClick={() => setFilter(value)}
                style={{
                  padding: "5px 10px", borderRadius: 20, border: "none",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: filter === value ? "#111827" : "#f3f4f6",
                  color: filter === value ? "white" : "#374151",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >{label}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 18, background: "#e5e7eb", flexShrink: 0 }} />

          <button
            className="filter-chip"
            onClick={() => setHillshade((v) => !v)}
            title={t.map_relief}
            style={{
              padding: "5px 9px", borderRadius: 20, border: "none",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: hillshade ? "#0369a1" : "#f3f4f6",
              color: hillshade ? "white" : "#374151",
              flexShrink: 0,
            }}
          >⛰️</button>

          <button
            className="filter-chip"
            onClick={() => setTerrain3d((v) => !v)}
            style={{
              padding: "5px 9px", borderRadius: 20, border: "none",
              fontSize: 11, fontWeight: 800, letterSpacing: "0.02em", cursor: "pointer",
              background: terrain3d ? "#7c3aed" : "#f3f4f6",
              color: terrain3d ? "white" : "#374151",
              flexShrink: 0,
            }}
          >3D</button>
        </div>

        {/* Search results (inline, extends panel) */}
        {searchOpen && searchResults.length > 0 && (
          <div style={{
            borderTop: "1px solid #f3f4f6",
            maxHeight: 260, overflowY: "auto",
            animation: "searchDrop 0.15s ease both",
          }}>
            {searchResults.map((peak) => {
              const isClimbed = ascentByPeakId.current.has(peak.id);
              return (
                <button
                  key={peak.id}
                  className="search-result"
                  onMouseDown={() => flyToPeak(peak)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "10px 14px",
                    background: "none", border: "none", cursor: "pointer",
                    textAlign: "left", borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{isClimbed ? "✅" : "🏔"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>
                      {peak.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                      {peak.altitudeM.toLocaleString(t.dateLocale)} m
                      {peak.mountainRange ? ` · ${peak.mountainRange}` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Hover tooltip ───────────────────────────────────────────────── */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x, top: tooltip.y - 40,
          transform: "translateX(-50%)",
          pointerEvents: "none", zIndex: 30,
          background: "rgba(17,24,39,0.78)", backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "white", fontSize: 12, fontWeight: 600,
          padding: "5px 13px", borderRadius: 20,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          {tooltip.text}
        </div>
      )}


      {/* ── Zoom controls ── bottom right ─────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 100, right: 12, zIndex: 10,
        display: "flex", flexDirection: "column", gap: 1,
      }}>
        {([{ label: "+", fn: () => mapRef.current?.zoomIn() }, { label: "−", fn: () => mapRef.current?.zoomOut() }] as const).map(({ label, fn }) => (
          <button
            key={label}
            onClick={fn}
            aria-label={label === "+" ? t.map_zoomIn : t.map_zoomOut}
            style={{
              width: 32, height: 32,
              background: "rgba(255,255,255,0.96)", border: "1px solid #d1d5db",
              borderRadius: label === "+" ? "8px 8px 0 0" : "0 0 8px 8px",
              fontSize: 18, color: "#374151", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
          >{label}</button>
        ))}
      </div>

      {/* ── Legend ── bottom right ─────────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 28, right: 12, zIndex: 10,
        background: "rgba(255,255,255,0.92)", borderRadius: 10,
        padding: "8px 12px", fontSize: 11, color: "#6b7280",
        pointerEvents: "none", display: "flex", flexDirection: "column", gap: 5,
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "linear-gradient(135deg,#dbeafe,#eff6ff)", border: "2px solid white", boxShadow: "0 0 0 2px #22c55e" }} />
          <span>{t.map_climbed}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#60a5fa", border: "2px solid white" }} />
          <span>{t.map_notYet}</span>
        </div>
      </div>

      {/* ── Detail panel ───────────────────────────────────────────────── */}
      {selected && (
        <div
          className={isMobile ? "map-panel-mobile" : "map-panel"}
          style={{
            position: "absolute",
            ...panelStyle,
            background: "white",
            zIndex: 20,
            overflowY: "auto",
            boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ position: "relative", aspectRatio: "3/2", overflow: "hidden", background: "#f1f5f9", flexShrink: 0 }}>
            {selected.ascent?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.ascent.photoUrl} alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <PanelPlaceholder />
            )}
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              style={{
                position: "absolute", top: 10, right: 10,
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                border: "none", cursor: "pointer",
                color: "white", fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
            <div style={{
              position: "absolute", bottom: 10, left: 12,
              background: "rgba(0,0,0,0.52)", backdropFilter: "blur(6px)",
              borderRadius: 20, padding: "4px 12px",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                {selected.peak.altitudeM.toLocaleString(t.dateLocale)} m
              </span>
            </div>
          </div>

          <div style={{ padding: "16px 16px 22px" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 2px", lineHeight: 1.25 }}>
              {selected.peak.name}
            </h2>
            {selected.peak.mountainRange && (
              <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 14px" }}>
                {selected.peak.mountainRange}
              </p>
            )}

            {selected.ascent ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{
                    background: "#dcfce7", color: "#16a34a",
                    borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                  }}>
                    ✓ {selected.ascent.ascentCount > 1
                      ? i(t.map_ascentsBadge, { n: selected.ascent.ascentCount })
                      : t.map_climbedBadge}
                  </span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {selected.ascent.ascentCount > 1 ? `${t.map_last} ` : ""}
                    {new Date(selected.ascent.date).toLocaleDateString(t.dateLocale, {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
                {selected.ascent.route && (
                  <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 5 }}>
                    <span>🧭</span> {selected.ascent.route}
                  </p>
                )}
                {(() => {
                  const a = selected.ascent!;
                  const href = a.ascentCount > 1 ? `/ascents?peak=${a.peakId}` : `/ascents/${a.ascentId}`;
                  const loading = navigatingTo === href;
                  return (
                    <button
                      className="panel-action-btn"
                      onClick={() => navigate(href)}
                      disabled={!!navigatingTo}
                      style={{
                        width: "100%", padding: "11px",
                        background: "#111827", color: "white",
                        border: "none", borderRadius: 12,
                        fontSize: 13, fontWeight: 700,
                        cursor: loading ? "wait" : "pointer",
                        opacity: loading ? 0.7 : 1,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {loading && <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />}
                      {a.ascentCount > 1
                        ? i(t.map_viewAscents, { n: a.ascentCount })
                        : t.map_viewAscent}
                    </button>
                  );
                })()}
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 16px" }}>
                  {t.map_notYetClimbed}
                </p>
                {(() => {
                  const href = `/ascents/new?peakId=${selected.peak.id}`;
                  const loading = navigatingTo === href;
                  return (
                    <button
                      className="panel-action-btn"
                      onClick={() => navigate(href)}
                      disabled={!!navigatingTo}
                      style={{
                        width: "100%", padding: "11px",
                        background: "#0369a1", color: "white",
                        border: "none", borderRadius: 12,
                        fontSize: 13, fontWeight: 700,
                        cursor: loading ? "wait" : "pointer",
                        opacity: loading ? 0.7 : 1,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {loading && <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />}
                      {t.map_logAscent}
                    </button>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
