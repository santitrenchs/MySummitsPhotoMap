"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

// ─── Types ───────────────────────────────────────────────────────────────────

type NearbyPeak = { id: string; name: string; latitude: number; longitude: number; altitudeM: number };

// ─── Map style ───────────────────────────────────────────────────────────────

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

// ─── Component ───────────────────────────────────────────────────────────────

export function PeakMiniMap({
  lat,
  lng,
  peakId,
  peakName,
  altitudeM,
}: {
  lat: number;
  lng: number;
  peakId: string;
  peakName: string;
  altitudeM: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [lng, lat],
      zoom: 11,
      interactive: false,
      attributionControl: false,
    });

    map.on("load", () => {
      // Add current peak immediately — no fetch needed, data is in props
      map.addSource("current-peak", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [{
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [lng, lat] },
            properties: { name: peakName, alt: altitudeM },
          }],
        },
      });

      map.addLayer({
        id: "current-peak-dot",
        type: "circle",
        source: "current-peak",
        paint: {
          "circle-radius": 5,
          "circle-color": "#dc2626",
          "circle-stroke-width": 2,
          "circle-stroke-color": "white",
        },
      });

      map.addLayer({
        id: "current-peak-label",
        type: "symbol",
        source: "current-peak",
        layout: {
          "text-field": ["concat", ["get", "name"], "\n", ["to-string", ["get", "alt"]], " m"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#dc2626",
          "text-halo-color": "rgba(255,255,255,0.9)",
          "text-halo-width": 1.5,
        },
      });

      // Fetch nearby peaks in parallel — non-critical, appears after
      fetch("/api/peaks")
        .then((r) => r.json())
        .then((peaks: NearbyPeak[]) => {
          const RADIUS = 0.8;
          const nearby = peaks.filter(
            (p) =>
              p.id !== peakId &&
              Math.abs(p.latitude - lat) < RADIUS &&
              Math.abs(p.longitude - lng) < RADIUS
          );

          if (map.getSource("nearby-peaks")) return;

          map.addSource("nearby-peaks", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: nearby.map((p) => ({
                type: "Feature" as const,
                geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] },
                properties: { name: p.name, alt: p.altitudeM },
              })),
            },
          });

          map.addLayer({
            id: "peak-dots",
            type: "circle",
            source: "nearby-peaks",
            paint: {
              "circle-radius": 3.5,
              "circle-color": "#1e293b",
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "white",
            },
          });

          map.addLayer({
            id: "peak-labels",
            type: "symbol",
            source: "nearby-peaks",
            minzoom: 7,
            layout: {
              "text-field": ["concat", ["get", "name"], "\n", ["to-string", ["get", "alt"]], " m"],
              "text-font": ["Noto Sans Regular"],
              "text-size": 10,
              "text-offset": [0, 1.2],
              "text-anchor": "top",
              "text-max-width": 8,
            },
            paint: {
              "text-color": "#1e293b",
              "text-halo-color": "rgba(255,255,255,0.9)",
              "text-halo-width": 1.5,
            },
          });
        })
        .catch(() => { /* non-critical */ });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng, peakId, peakName, altitudeM]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
