"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Real Pyrenean peaks with accurate coordinates
const PEAKS = [
  // Captured — show green ring
  {
    name: "Aneto",
    lng: 0.656, lat: 42.631,
    alt: "3.404 m", rarity: "Edelweiss", rarityEmoji: "🌸",
    color: "#3B82F6", captured: true,
  },
  {
    name: "Monte Perdido",
    lng: 0.035, lat: 42.682,
    alt: "3.355 m", rarity: "Edelweiss", rarityEmoji: "🌸",
    color: "#3B82F6", captured: true,
  },
  // Uncaptured — show rarity badge + pulsing dot
  {
    name: "Vignemale",
    lng: -0.143, lat: 42.772,
    alt: "3.298 m", rarity: "Edelweiss", rarityEmoji: "🌸",
    color: "#3B82F6", captured: false,
  },
  {
    name: "Posets",
    lng: 0.430, lat: 42.652,
    alt: "3.375 m", rarity: "Edelweiss", rarityEmoji: "🌸",
    color: "#3B82F6", captured: false,
  },
  {
    name: "Pica d'Estats",
    lng: 1.400, lat: 42.668,
    alt: "3.143 m", rarity: "Edelweiss", rarityEmoji: "🌸",
    color: "#3B82F6", captured: false,
  },
];

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
      attribution: "",
    },
    terrain: {
      type: "raster-dem",
      url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      tileSize: 256,
      encoding: "terrarium",
    },
  },
  layers: [{ id: "carto-tiles", type: "raster", source: "carto", paint: { "raster-opacity": 1 } }],
};

function makeCapturedMarker(peak: typeof PEAKS[0]): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: default;
    pointer-events: none;
  `;

  // Badge above the dot
  const badge = document.createElement("div");
  badge.style.cssText = `
    background: rgba(255,255,255,0.96);
    border: 1px solid rgba(13,37,56,0.12);
    border-radius: 999px;
    padding: 4px 9px 4px 7px;
    font-size: 11px;
    font-weight: 700;
    color: #0D2538;
    white-space: nowrap;
    box-shadow: 0 2px 12px rgba(13,37,56,0.14);
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 6px;
    font-family: system-ui, sans-serif;
  `;
  badge.innerHTML = `
    <span style="width:8px;height:8px;border-radius:50%;background:#16A34A;display:inline-block;flex-shrink:0"></span>
    <span>${peak.name}</span>
    <span style="color:#6B7280;font-weight:500">${peak.alt}</span>
  `;

  // Green ring dot
  const dot = document.createElement("div");
  dot.style.cssText = `
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(22,163,74,0.15);
    border: 2.5px solid #16A34A;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(22,163,74,0.30);
  `;
  dot.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  // Stem
  const stem = document.createElement("div");
  stem.style.cssText = `width:2px;height:8px;background:#16A34A;opacity:0.5;border-radius:1px;margin-top:2px;`;

  wrap.appendChild(badge);
  wrap.appendChild(dot);
  wrap.appendChild(stem);
  return wrap;
}

function makeUncapturedMarker(peak: typeof PEAKS[0]): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: default;
    pointer-events: none;
  `;

  // Floating badge
  const badge = document.createElement("div");
  badge.style.cssText = `
    background: rgba(255,255,255,0.95);
    border: 1.5px solid ${peak.color}50;
    border-radius: 999px;
    padding: 4px 10px 4px 7px;
    font-size: 11px;
    font-weight: 600;
    color: #0D2538;
    white-space: nowrap;
    box-shadow: 0 2px 12px ${peak.color}30;
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 6px;
    font-family: system-ui, sans-serif;
  `;
  badge.innerHTML = `
    <span>${peak.rarityEmoji}</span>
    <span style="color:${peak.color};font-weight:700">${peak.rarity}</span>
    <span style="color:#9CA3AF;font-weight:500">·</span>
    <span style="color:#6B7280;font-weight:500">${peak.alt}</span>
  `;

  // Pulsing dot
  const dotWrap = document.createElement("div");
  dotWrap.style.cssText = `position:relative;width:22px;height:22px;`;

  const pulse = document.createElement("div");
  pulse.className = "hero-map-pulse";
  pulse.style.cssText = `
    position:absolute;inset:0;border-radius:50%;
    background:${peak.color}30;
    animation: heroMapPulse 2s ease-out infinite;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    width:12px;height:12px;border-radius:50%;
    background:${peak.color};
    box-shadow: 0 0 8px ${peak.color}80;
    border: 2px solid rgba(255,255,255,0.9);
  `;

  const captureIcon = document.createElement("div");
  captureIcon.style.cssText = `
    position: absolute;
    top: -5px;
    right: -5px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    border: 1.5px solid ${peak.color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    line-height: 1;
    color: ${peak.color};
    font-weight: 900;
  `;
  captureIcon.textContent = "+";

  dotWrap.appendChild(pulse);
  dotWrap.appendChild(dot);
  dotWrap.appendChild(captureIcon);

  const stem = document.createElement("div");
  stem.style.cssText = `width:2px;height:6px;background:${peak.color};opacity:0.4;border-radius:1px;margin-top:1px;`;

  wrap.appendChild(badge);
  wrap.appendChild(dotWrap);
  wrap.appendChild(stem);
  return wrap;
}

export default function HeroMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [0.62, 42.68],
      zoom: 8.4,
      pitch: 40,
      bearing: -8,
      interactive: false, // fully disabled — decorative only
      attributionControl: false,
    });
    mapRef.current = map;

    map.once("load", () => {
      // Add terrain hillshade
      map.addSource("terrain-dem", {
        type: "raster-dem",
        url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
        tileSize: 256,
        encoding: "terrarium",
      });
      map.setTerrain({ source: "terrain-dem", exaggeration: 1.4 });

      // Add peak markers
      PEAKS.forEach((peak) => {
        const el = peak.captured ? makeCapturedMarker(peak) : makeUncapturedMarker(peak);
        new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([peak.lng, peak.lat])
          .addTo(map);
      });

      // Resize after terrain loads to ensure correct dimensions on iOS
      map.once("idle", () => map.resize());
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      <style>{`
        @keyframes heroMapPulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(2.8); opacity: 0; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        /* Hide MapLibre logo on landing */
        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-bottom-right { display: none !important; }
      `}</style>
    </>
  );
}
