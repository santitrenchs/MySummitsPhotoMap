"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ascentByPeakId = useRef(new Map(ascentData.map((a) => [a.peakId, a])));
  const markerEls = useRef(new Map<string, HTMLElement>()); // peakId → el
  const justSelectedRef = useRef(false);

  const [selected, setSelected] = useState<Selected>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [hillshade, setHillshade] = useState(true);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Apply filter: toggle HTML markers + GeoJSON layer visibility
  useEffect(() => {
    const showAscended = filter !== "not-climbed";
    const showUnascended = filter !== "climbed";

    markerEls.current.forEach((el) => {
      el.style.display = showAscended ? "block" : "none";
    });

    const map = mapRef.current;
    if (map) {
      for (const layer of ["clusters", "cluster-count", "unclustered-peaks", "peak-labels"]) {
        if (map.getLayer(layer)) {
          map.setLayoutProperty(layer, "visibility", showUnascended ? "visible" : "none");
        }
      }
    }
  }, [filter]);

  // Clear selection if it's hidden by the current filter
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

  // Map initialisation (runs once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [0.5, 42.75],
      zoom: 8,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("click", () => {
      if (justSelectedRef.current) { justSelectedRef.current = false; return; }
      setSelected(null);
    });

    map.once("load", () => {
      map.resize();

      // ── Terrain / hillshade ─────────────────────────────────────────────
      map.addSource("terrain", {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 15,
      });
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

      // ── GeoJSON source for unascended peaks (with clustering) ───────────
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

      // Cluster bubbles
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

      // Cluster count label
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

      // Individual unclustered dots
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

      // Peak name labels at zoom ≥ 10 (unascended only)
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

      // ── Cluster click → zoom in ─────────────────────────────────────────
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

      // ── Unclustered dot click → open panel ─────────────────────────────
      map.on("click", "unclustered-peaks", (e) => {
        justSelectedRef.current = true;
        const props = e.features?.[0]?.properties;
        if (!props) return;
        const peak = peaks.find((p) => p.id === props.id);
        if (peak) setSelected({ peak, ascent: null });
      });

      // ── Hover tooltips ──────────────────────────────────────────────────
      map.on("mousemove", "unclustered-peaks", (e) => {
        const props = e.features?.[0]?.properties;
        if (!props || !containerRef.current) return;
        const pt = map.project(e.lngLat);
        setTooltip({ text: `${props.name} · ${Number(props.alt).toLocaleString()} m`, x: pt.x, y: pt.y });
      });
      map.on("mouseleave", "unclustered-peaks", () => setTooltip(null));

      map.on("mousemove", "clusters", (e) => {
        const props = e.features?.[0]?.properties;
        if (!props || !containerRef.current) return;
        const pt = map.project(e.lngLat);
        setTooltip({ text: `${props.point_count} unclimbed peaks · click to zoom`, x: pt.x, y: pt.y });
      });
      map.on("mouseleave", "clusters", () => setTooltip(null));

      // ── Cursor changes ──────────────────────────────────────────────────
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
          // Initials fallback
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

        el.addEventListener("mouseenter", () => {
          el.style.boxShadow = RING_HOVER;
        });
        el.addEventListener("mousemove", (e) => {
          if (!containerRef.current) return;
          const me = e as MouseEvent;
          const cRect = containerRef.current.getBoundingClientRect();
          setTooltip({
            text: `${peak.name} · ${peak.altitudeM.toLocaleString()} m`,
            x: me.clientX - cRect.left,
            y: me.clientY - cRect.top,
          });
        });
        el.addEventListener("mouseleave", () => {
          el.style.boxShadow = RING;
          setTooltip(null);
        });
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
    }); // end map.once("load")

    return () => {
      map.remove();
      mapRef.current = null;
      markerEls.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived counts for filter chips ────────────────────────────────────────
  const climbedCount = ascentData.length;
  const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: `All  ${peaks.length}` },
    { value: "climbed", label: `✓ Climbed  ${climbedCount}` },
    { value: "not-climbed", label: `○ Not yet  ${peaks.length - climbedCount}` },
  ];

  const panelStyle: React.CSSProperties = isMobile
    ? { bottom: 0, left: 0, right: 0, borderRadius: "20px 20px 0 0", maxHeight: "70vh" }
    : { top: 12, right: 12, width: 300, maxHeight: "calc(100% - 80px)", borderRadius: 18 };

  return (
    <div style={{ position: "relative", height: "calc(100svh - var(--top-nav-h, 3.5rem) - var(--bottom-nav-h, 0px))", background: "#e2e8f0" }}>
      <style>{`
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes panelInMobile {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .map-panel { animation: panelIn 0.22s ease both; }
        .map-panel-mobile { animation: panelInMobile 0.28s ease both; }
        .filter-chip { transition: background 0.15s, color 0.15s, box-shadow 0.15s; }
        .filter-chip:active { transform: scale(0.95); }
        .panel-action-btn { transition: opacity 0.15s, transform 0.15s; }
        .panel-action-btn:hover { opacity: 0.88; transform: scale(0.98); }
      `}</style>

      {/* Map canvas */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

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

      {/* ── Filter chips + Relief ── top left ──────────────────────────── */}
      <div style={{
        position: "absolute", top: 12, left: 12, zIndex: 10,
        display: "flex", gap: 6, flexWrap: "wrap",
      }}>
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            className="filter-chip"
            onClick={() => setFilter(value)}
            style={{
              padding: "7px 14px", borderRadius: 24, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: filter === value ? "#111827" : "rgba(255,255,255,0.92)",
              color: filter === value ? "white" : "#374151",
              boxShadow: "0 1px 8px rgba(0,0,0,0.15)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}
          >{label}</button>
        ))}
        <button
          className="filter-chip"
          onClick={() => setHillshade((v) => !v)}
          style={{
            padding: "7px 14px", borderRadius: 24, border: "none",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: hillshade ? "#0369a1" : "rgba(255,255,255,0.92)",
            color: hillshade ? "white" : "#374151",
            boxShadow: "0 1px 8px rgba(0,0,0,0.15)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          }}
        >🏔 Relief</button>
      </div>

      {/* ── Zoom controls ── bottom right ─────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 80, right: 12, zIndex: 10,
        display: "flex", flexDirection: "column", gap: 1,
      }}>
        {([{ label: "+", fn: () => mapRef.current?.zoomIn() }, { label: "−", fn: () => mapRef.current?.zoomOut() }] as const).map(({ label, fn }) => (
          <button
            key={label}
            onClick={fn}
            aria-label={label === "+" ? "Zoom in" : "Zoom out"}
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
        position: "absolute", bottom: 36, right: 12, zIndex: 10,
        background: "rgba(255,255,255,0.92)", borderRadius: 10,
        padding: "8px 12px", fontSize: 11, color: "#6b7280",
        pointerEvents: "none", display: "flex", flexDirection: "column", gap: 5,
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "linear-gradient(135deg,#dbeafe,#eff6ff)", border: "2px solid white", boxShadow: "0 0 0 2px #22c55e" }} />
          <span>Climbed</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#60a5fa", border: "2px solid white" }} />
          <span>Not yet</span>
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
          {/* Hero image */}
          <div style={{ position: "relative", aspectRatio: "3/2", overflow: "hidden", background: "#f1f5f9", flexShrink: 0 }}>
            {selected.ascent?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.ascent.photoUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <PanelPlaceholder />
            )}
            {/* Close button */}
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
            {/* Altitude badge */}
            <div style={{
              position: "absolute", bottom: 10, left: 12,
              background: "rgba(0,0,0,0.52)", backdropFilter: "blur(6px)",
              borderRadius: 20, padding: "4px 12px",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                {selected.peak.altitudeM.toLocaleString()} m
              </span>
            </div>
          </div>

          {/* Info */}
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
                  }}>✓ Climbed</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {new Date(selected.ascent.date).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
                {selected.ascent.route && (
                  <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 5 }}>
                    <span>🧭</span> {selected.ascent.route}
                  </p>
                )}
                <button
                  className="panel-action-btn"
                  onClick={() => router.push(`/ascents/${selected.ascent!.ascentId}`)}
                  style={{
                    width: "100%", padding: "11px",
                    background: "#111827", color: "white",
                    border: "none", borderRadius: 12,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  View ascent →
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 16px" }}>
                  Not yet climbed
                </p>
                <button
                  className="panel-action-btn"
                  onClick={() => router.push(`/ascents/new?peakId=${selected.peak.id}`)}
                  style={{
                    width: "100%", padding: "11px",
                    background: "#0369a1", color: "white",
                    border: "none", borderRadius: 12,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  + Log ascent
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
