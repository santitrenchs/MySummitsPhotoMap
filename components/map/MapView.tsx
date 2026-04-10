"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";

export type MapPeak = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  mountainRange: string | null;
  country: string;
};

const STYLE: maplibregl.StyleSpecification = {
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
      attribution:
        "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> © <a href='https://carto.com/attributions'>CARTO</a>",
    },
  },
  layers: [{ id: "carto-tiles", type: "raster", source: "carto" }],
};

export default function MapView({
  peaks,
  ascentedPeakIds = [],
}: {
  peaks: MapPeak[];
  ascentedPeakIds?: string[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ascentedSet = useRef(new Set(ascentedPeakIds));
  const justSelectedRef = useRef(false);
  const [selected, setSelected] = useState<MapPeak | null>(null);
  const [zoom, setZoom] = useState(8);
  const [hillshade, setHillshade] = useState(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [0.5, 42.75],
      zoom: 8,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("zoom", () => setZoom(Math.round(map.getZoom() * 10) / 10));
    map.on("click", () => {
      if (justSelectedRef.current) { justSelectedRef.current = false; return; }
      setSelected(null);
    });

    map.once("load", () => {
      map.resize();

      // Terrain elevation source for hillshading (AWS Terrarium, no API key)
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

      // GeoJSON source for name/altitude labels
      map.addSource("peaks-labels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: peaks.map((p) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] },
            properties: { name: p.name, alt: p.altitudeM },
          })),
        },
      });

      // Labels visible from zoom 10 onwards; MapLibre handles collision avoidance
      map.addLayer({
        id: "peak-labels",
        type: "symbol",
        source: "peaks-labels",
        minzoom: 10,
        layout: {
          "text-field": ["concat", ["get", "name"], "\n", ["to-string", ["get", "alt"]], " m"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-optional": true,
          "text-allow-overlap": false,
          "text-max-width": 9,
        },
        paint: {
          "text-color": "#1f2937",
          "text-halo-color": "rgba(255,255,255,0.88)",
          "text-halo-width": 1.5,
        },
      });

      peaks.forEach((peak) => {
        const ascended = ascentedSet.current.has(peak.id);
        const color = ascended ? "#16a34a" : "#0369a1";
        const shadowBase = "0 1px 4px rgba(0,0,0,0.4)";
        const shadowHover = `0 0 0 5px ${ascended ? "rgba(22,163,74,0.25)" : "rgba(3,105,161,0.25)"}, 0 1px 4px rgba(0,0,0,0.4)`;

        // Single element — MapLibre writes translate() on it.
        // We use box-shadow for hover (doesn't touch transform).
        const el = document.createElement("button");
        el.setAttribute("type", "button");
        el.setAttribute("aria-label", `${peak.name} ${peak.altitudeM}m`);
        el.style.cssText = [
          "width:14px",
          "height:14px",
          "border-radius:50%",
          `background:${color}`,
          "border:2.5px solid white",
          `box-shadow:${shadowBase}`,
          "cursor:pointer",
          "padding:0",
          "outline:none",
          "display:block",
          "transition:box-shadow 0.15s",
        ].join(";");

        el.addEventListener("mouseenter", () => { el.style.boxShadow = shadowHover; });
        el.addEventListener("mouseleave", () => { el.style.boxShadow = shadowBase; });
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          justSelectedRef.current = true;
          setSelected(peak);
        });

        new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([peak.longitude, peak.latitude])
          .addTo(map);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("hillshading")) return;
    map.setLayoutProperty("hillshading", "visibility", hillshade ? "visible" : "none");
  }, [hillshade]);

  return (
    <div style={{ position: "relative", height: "calc(100vh - 3.5rem)" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* Badge */}
      <div style={{
        position: "absolute", top: 12, left: 12, zIndex: 10,
        display: "flex", gap: 6,
        pointerEvents: "none",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.92)", border: "1px solid #e5e7eb",
          borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#4b5563",
        }}>
          <strong style={{ color: "#111827" }}>{peaks.length}</strong> Pyrenean peaks &gt;3000m
        </div>
        <div style={{
          background: "rgba(255,255,255,0.92)", border: "1px solid #e5e7eb",
          borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#4b5563",
        }}>
          zoom <strong style={{ color: "#111827" }}>{zoom}</strong>
          {zoom < 10 && <span style={{ color: "#9ca3af" }}> · labels at 10</span>}
        </div>
        <button
          onClick={() => setHillshade((v) => !v)}
          style={{
            background: hillshade ? "#0369a1" : "rgba(255,255,255,0.92)",
            border: "1px solid #e5e7eb",
            borderRadius: 8, padding: "6px 12px", fontSize: 12,
            color: hillshade ? "white" : "#4b5563",
            cursor: "pointer", pointerEvents: "auto",
          }}
        >
          Relief
        </button>
      </div>

      {/* Zoom controls */}
      <div style={{
        position: "absolute", bottom: 110, right: 12, zIndex: 10,
        display: "flex", flexDirection: "column", gap: 1,
      }}>
        {[{ label: "+", action: () => mapRef.current?.zoomIn() }, { label: "−", action: () => mapRef.current?.zoomOut() }].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              width: 30, height: 30,
              background: "rgba(255,255,255,0.95)", border: "1px solid #d1d5db",
              borderRadius: label === "+" ? "8px 8px 0 0" : "0 0 8px 8px",
              fontSize: 18, fontWeight: 400, color: "#374151",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
            aria-label={label === "+" ? "Zoom in" : "Zoom out"}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 36, right: 12, zIndex: 10,
        background: "rgba(255,255,255,0.92)", border: "1px solid #e5e7eb",
        borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#4b5563",
        pointerEvents: "none", display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#0369a1", border: "2px solid white", boxShadow: "0 1px 2px rgba(0,0,0,0.3)", display: "inline-block" }} />
          Not ascended
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#16a34a", border: "2px solid white", boxShadow: "0 1px 2px rgba(0,0,0,0.3)", display: "inline-block" }} />
          Ascended
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <>
          <div style={{
            position: "absolute", top: 12, right: 12, width: 280,
            background: "white", borderRadius: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            border: "1px solid #f3f4f6", padding: 20, zIndex: 20,
          }}>
            <button
              onClick={() => setSelected(null)}
              style={{
                position: "absolute", top: 10, right: 10, width: 24, height: 24,
                border: "none", background: "none", cursor: "pointer",
                fontSize: 12, color: "#9ca3af", borderRadius: 4,
              }}
              aria-label="Close"
            >✕</button>

            <div style={{ paddingRight: 24 }}>
              <h2 style={{ fontWeight: 700, fontSize: 15, color: "#111827", margin: 0 }}>
                {selected.name}
              </h2>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#0369a1", margin: "4px 0 0" }}>
                {selected.altitudeM.toLocaleString()}
                <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7280", marginLeft: 4 }}>m</span>
              </p>
              {selected.mountainRange && (
                <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>
                  {selected.mountainRange}
                </p>
              )}
              <p style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace", margin: "8px 0 0" }}>
                {selected.latitude.toFixed(4)}°N · {selected.longitude.toFixed(4)}°E
              </p>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
              {ascentedSet.current.has(selected.id) ? (
                <p style={{ fontSize: 13, color: "#16a34a", fontWeight: 600, textAlign: "center", margin: 0 }}>
                  ✓ You have ascended this peak
                </p>
              ) : (
                <button
                  style={{
                    width: "100%", padding: "8px 12px", background: "#0369a1",
                    color: "white", border: "none", borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                  onClick={() => router.push(`/ascents/new?peakId=${selected.id}`)}
                >
                  + Log ascent
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
