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
    "terrain-hillshade": {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      tileSize: 256,
      encoding: "terrarium",
      maxzoom: 15,
    },
  },
  layers: [
    { id: "carto", type: "raster", source: "carto" },
    {
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
    },
  ],
};

// ─── Rarity colors ───────────────────────────────────────────────────────────

function getRarityColors(altitudeM: number): { main: string; dark: string } {
  if (altitudeM >= 5000) return { main: "#EAB308", dark: "#a87e06" };
  if (altitudeM >= 3000) return { main: "#F97316", dark: "#c55e0a" };
  if (altitudeM >= 1500) return { main: "#7B5BA6", dark: "#5c4480" };
  return { main: "#00995C", dark: "#00763d" };
}

// ─── Peakadex ball marker ────────────────────────────────────────────────────

function createBallMarker(main: string, dark: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "width:76px;height:76px;position:absolute;pointer-events:none";
  el.innerHTML = `<svg width="76" height="76" viewBox="-29 -29 88 88" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="44" fill="none" stroke="${dark}" stroke-width="1.2" opacity="0.12"/>
    <circle cx="15" cy="15" r="38" fill="none" stroke="${dark}" stroke-width="1.2" opacity="0.22"/>
    <circle cx="15" cy="15" r="32" fill="none" stroke="${dark}" stroke-width="1.2" opacity="0.38"/>
    <circle cx="15" cy="15" r="26" fill="none" stroke="${dark}" stroke-width="1.2" opacity="0.55"/>
    <ellipse cx="15" cy="27" rx="8" ry="2.5" fill="rgba(0,0,0,.2)"/>
    <circle cx="15" cy="15" r="13" fill="white"/>
    <path d="M 2,15 A 13,13 0 0,1 28,15 Z" fill="${main}"/>
    <circle cx="15" cy="15" r="13" fill="none" stroke="${dark}" stroke-width="1.2"/>
    <rect x="1" y="13" width="28" height="4" fill="white"/>
    <line x1="2" y1="15" x2="28" y2="15" stroke="${dark}" stroke-width="1.2"/>
    <circle cx="15" cy="15" r="4.5" fill="white" stroke="${dark}" stroke-width="1.5"/>
    <path d="M 6,8 A 13,13 0 0,1 24,8 Q 22,13 15,14 Q 8,13 6,8 Z" fill="white" opacity=".25"/>
  </svg>`;
  return el;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PeakMiniMap({
  lat,
  lng,
  peakId,
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

    const { main, dark } = getRarityColors(altitudeM);

    map.on("load", () => {
      // Peakadex ball HTML marker for the main peak
      new maplibregl.Marker({ element: createBallMarker(main, dark), anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);

      // Fetch nearby peaks — ghost dots only, no labels
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
            id: "peak-ghost-dots",
            type: "circle",
            source: "nearby-peaks",
            paint: {
              "circle-radius": 5,
              "circle-color": "#1e293b",
              "circle-opacity": 0.7,
              "circle-stroke-width": 2,
              "circle-stroke-color": "white",
              "circle-stroke-opacity": 0.95,
            },
          });
          map.addLayer({
            id: "peak-labels",
            type: "symbol",
            source: "nearby-peaks",
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
              "text-halo-color": "rgba(255,255,255,0.92)",
              "text-halo-width": 1.5,
            },
          });
        })
        .catch(() => { /* non-critical */ });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng, peakId, altitudeM]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
