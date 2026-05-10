"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Real Pyrenean peaks — positioned in the right (transparent) half of the hero
const PEAKS = [
  { name: "Aneto",          lng: 0.656,  lat: 42.631, alt: "3.404 m", rarity: "Edelweiss", rarityEmoji: "🌸", color: "#3B82F6", captured: true  },
  { name: "Monte Perdido",  lng: 0.035,  lat: 42.682, alt: "3.355 m", rarity: "Edelweiss", rarityEmoji: "🌸", color: "#3B82F6", captured: true  },
  { name: "Vignemale",      lng: -0.143, lat: 42.772, alt: "3.298 m", rarity: "Edelweiss", rarityEmoji: "🌸", color: "#3B82F6", captured: false },
  { name: "Posets",         lng: 0.430,  lat: 42.652, alt: "3.375 m", rarity: "Edelweiss", rarityEmoji: "🌸", color: "#3B82F6", captured: false },
  { name: "Pica d'Estats",  lng: 1.400,  lat: 42.668, alt: "3.143 m", rarity: "Edelweiss", rarityEmoji: "🌸", color: "#3B82F6", captured: false },
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
  },
  layers: [{ id: "carto-tiles", type: "raster", source: "carto" }],
};

export default function HeroMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      // Center west of the peaks so they appear in the transparent right half
      center: [-1.4, 42.52],
      zoom: 7.6,
      pitch: 45,
      bearing: -5,
      interactive: false,
      attributionControl: false,
    });
    mapRef.current = map;

    map.once("load", () => {
      // Add hillshade terrain
      map.addSource("terrain-dem", {
        type: "raster-dem",
        url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
        tileSize: 256,
        encoding: "terrarium",
      });
      map.setTerrain({ source: "terrain-dem", exaggeration: 1.5 });

      // Wait for first idle (tiles + terrain rendered) then position overlay markers
      map.once("idle", () => {
        map.resize();
        renderOverlayMarkers(map);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderOverlayMarkers(map: maplibregl.Map) {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.innerHTML = "";

    PEAKS.forEach((peak) => {
      const pixel = map.project([peak.lng, peak.lat]);

      const wrap = document.createElement("div");
      wrap.style.cssText = `
        position: absolute;
        left: ${pixel.x}px;
        top: ${pixel.y}px;
        transform: translateX(-50%) translateY(-100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
        gap: 0;
      `;

      if (peak.captured) {
        // ── Captured: green ring + name badge ──
        const badge = document.createElement("div");
        badge.style.cssText = `
          background: rgba(255,255,255,0.97);
          border: 1px solid rgba(13,37,56,0.13);
          border-radius: 999px;
          padding: 4px 10px 4px 7px;
          font-size: 11px;
          font-weight: 700;
          color: #0D2538;
          white-space: nowrap;
          box-shadow: 0 2px 14px rgba(13,37,56,0.16);
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 5px;
          font-family: system-ui, -apple-system, sans-serif;
          letter-spacing: -0.01em;
        `;
        badge.innerHTML = `
          <span style="width:8px;height:8px;border-radius:50%;background:#16A34A;display:inline-block;flex-shrink:0;box-shadow:0 0 4px #16A34A80"></span>
          <span>${peak.name}</span>
          <span style="color:#9CA3AF;font-weight:400;font-size:10px">${peak.alt}</span>
        `;

        const ring = document.createElement("div");
        ring.style.cssText = `
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(22,163,74,0.12);
          border: 2.5px solid #16A34A;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 4px rgba(22,163,74,0.12);
        `;
        ring.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        const stem = document.createElement("div");
        stem.style.cssText = `width:2px;height:7px;background:#16A34A;opacity:0.4;border-radius:0 0 1px 1px;`;

        wrap.appendChild(badge);
        wrap.appendChild(ring);
        wrap.appendChild(stem);

      } else {
        // ── Uncaptured: rarity badge + pulsing dot + "+" capture icon ──
        const badge = document.createElement("div");
        badge.style.cssText = `
          background: rgba(255,255,255,0.96);
          border: 1.5px solid ${peak.color}55;
          border-radius: 999px;
          padding: 4px 10px 4px 7px;
          font-size: 11px;
          font-weight: 600;
          color: #0D2538;
          white-space: nowrap;
          box-shadow: 0 2px 14px ${peak.color}30;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 5px;
          font-family: system-ui, -apple-system, sans-serif;
          letter-spacing: -0.01em;
        `;
        badge.innerHTML = `
          <span>${peak.rarityEmoji}</span>
          <span style="color:${peak.color};font-weight:700">${peak.rarity}</span>
          <span style="color:#D1D5DB;font-size:9px">·</span>
          <span style="color:#9CA3AF;font-weight:400;font-size:10px">${peak.alt}</span>
        `;

        const dotWrap = document.createElement("div");
        dotWrap.style.cssText = `position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;`;

        const pulse = document.createElement("div");
        pulse.style.cssText = `
          position:absolute;inset:0;border-radius:50%;
          background:${peak.color}25;
          animation:heroMapPulse 2.2s ease-out infinite;
        `;

        const dot = document.createElement("div");
        dot.style.cssText = `
          width:13px;height:13px;border-radius:50%;
          background:${peak.color};
          box-shadow:0 0 10px ${peak.color}80;
          border:2px solid rgba(255,255,255,0.95);
          position:relative;z-index:1;
        `;

        const plus = document.createElement("div");
        plus.style.cssText = `
          position:absolute;top:-3px;right:-3px;
          width:13px;height:13px;border-radius:50%;
          background:white;border:1.5px solid ${peak.color};
          display:flex;align-items:center;justify-content:center;
          font-size:9px;font-weight:900;color:${peak.color};
          line-height:1;z-index:2;
          font-family:system-ui,-apple-system,sans-serif;
        `;
        plus.textContent = "+";

        dotWrap.appendChild(pulse);
        dotWrap.appendChild(dot);
        dotWrap.appendChild(plus);

        const stem = document.createElement("div");
        stem.style.cssText = `width:2px;height:6px;background:${peak.color};opacity:0.35;border-radius:0 0 1px 1px;`;

        wrap.appendChild(badge);
        wrap.appendChild(dotWrap);
        wrap.appendChild(stem);
      }

      overlay.appendChild(wrap);
    });
  }

  return (
    <>
      {/* Map canvas — no z-index so it doesn't create a stacking context */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Marker overlay — rendered at z-index 5, above gradient (z:2) and text (z:3) */}
      <div
        ref={overlayRef}
        style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", overflow: "visible" }}
      />

      <style>{`
        @keyframes heroMapPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(3);   opacity: 0; }
          100% { transform: scale(3);   opacity: 0; }
        }
        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-bottom-right { display: none !important; }
      `}</style>
    </>
  );
}
