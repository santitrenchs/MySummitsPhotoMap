"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { getRarityColor as getRarityColorFromLib, RARITY_ALT_STEP_EXPR } from "@/lib/rarity";

// ─── Types ───────────────────────────────────────────────────────────────────

type NearbyPeak = { id: string; name: string; latitude: number; longitude: number; altitudeM: number };

// ─── Nearby peaks cache ───────────────────────────────────────────────────────

const nearbyCache = new Map<string, NearbyPeak[]>();
const inFlight = new Set<string>();
// Maps that load before the prefetch resolves park their render fn here.
// Array so multiple card instances for the same peak all get rendered.
const pendingRenders = new Map<string, Array<(nearby: NearbyPeak[]) => void>>();
const RADIUS = 0.8;
const MAX_NEARBY = 5;

function top5(peaks: NearbyPeak[], excludeId: string): NearbyPeak[] {
  return peaks
    .filter((p) => p.id !== excludeId)
    .sort((a, b) => b.altitudeM - a.altitudeM)
    .slice(0, MAX_NEARBY);
}

function firePending(peakId: string, nearby: NearbyPeak[]) {
  const fns = pendingRenders.get(peakId);
  if (fns?.length) fns.forEach((fn) => fn(nearby));
  pendingRenders.delete(peakId);
}

export function prefetchNearbyPeaks(peakId: string, lat: number, lng: number): void {
  if (nearbyCache.has(peakId)) {
    // Cache already ready — fire any maps that loaded while waiting.
    firePending(peakId, nearbyCache.get(peakId)!);
    return;
  }
  if (inFlight.has(peakId)) return;
  inFlight.add(peakId);
  fetch(`/api/peaks?lat=${lat}&lng=${lng}&radius=${RADIUS}`)
    .then((r) => r.json())
    .then((peaks: NearbyPeak[]) => {
      const nearby = top5(peaks as NearbyPeak[], peakId);
      nearbyCache.set(peakId, nearby);
      firePending(peakId, nearby);
    })
    .catch(() => {})
    .finally(() => inFlight.delete(peakId));
}

// ─── Map style ───────────────────────────────────────────────────────────────

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sources: {
    opentopomap: {
      type: "raster",
      tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, © OpenTopoMap (CC-BY-SA)",
      maxzoom: 17,
    },
  },
  layers: [
    { id: "opentopomap", type: "raster", source: "opentopomap" },
  ],
};

// ─── Rarity color (lib/rarity.ts is the source of truth) ────────────────────

const getRarityColor = getRarityColorFromLib;

// ─── Flower emoji marker ─────────────────────────────────────────────────────

function createDotMarker(color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `position:absolute;pointer-events:none;width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.45)`;
  return el;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PeakMiniMap({
  lat,
  lng,
  peakId,
  altitudeM,
  disableNearby = false,
}: {
  lat: number;
  lng: number;
  peakId: string;
  peakName: string;
  altitudeM: number;
  /** Skip the nearby-peaks fetch/markers entirely (e.g. public share page where
   *  /api/peaks is not accessible). Base map + central peak marker still render. */
  disableNearby?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [lng, lat],
      zoom: 12,
      interactive: false,
      attributionControl: false,
    });

    const color = getRarityColor(altitudeM);

    function renderNearby(nearby: NearbyPeak[]) {
      if (!nearby.length || map.getSource("nearby-peaks")) return;
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
          "circle-color": RARITY_ALT_STEP_EXPR as maplibregl.ExpressionSpecification,
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
    }

    map.on("load", () => {
      new maplibregl.Marker({ element: createDotMarker(color), anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);

      // Resize immediately — on iOS the card back is hidden (rotateY 180°) when
      // preloading=true, so the container starts at 0×0. Resize here and again
      // on idle so the canvas has correct dimensions before/after the flip.
      map.resize();
      map.once("idle", () => map.resize());

      if (disableNearby) return; // public share page: no /api/peaks fetch
      const cached = nearbyCache.get(peakId);
      if (cached) {
        // Prefetch already finished — render immediately.
        renderNearby(cached);
      } else {
        // Prefetch still in-flight: register this instance so it renders the
        // moment the fetch lands.  Also call prefetchNearbyPeaks as a
        // belt-and-suspenders trigger in case AscentCard's useEffect raced
        // (e.g., React dev double-invoke) and the fetch never started.
        const existing = pendingRenders.get(peakId) ?? [];
        existing.push(renderNearby);
        pendingRenders.set(peakId, existing);
        prefetchNearbyPeaks(peakId, lat, lng);
      }
    });

    // ResizeObserver: when the card flips and the container goes from 0 to its
    // real height, resize the map so GeoJSON layers and the marker reposition.
    const ro = new ResizeObserver(() => { map.resize(); });
    ro.observe(containerRef.current);

    mapRef.current = map;
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      // Remove this instance's render fn from the pending list on unmount.
      const existing = pendingRenders.get(peakId);
      if (existing) {
        const updated = existing.filter((fn) => fn !== renderNearby);
        if (updated.length) pendingRenders.set(peakId, updated);
        else pendingRenders.delete(peakId);
      }
    };
  }, [lat, lng, peakId, altitudeM]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
