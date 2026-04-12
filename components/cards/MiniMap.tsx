"use client";

import { useEffect, useRef } from "react";

interface Props {
  latitude: number;
  longitude: number;
  peakName: string;
  zoom?: number;
}

export function MiniMap({ latitude, longitude, peakName, zoom = 12 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<boolean>(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;

    import("maplibre-gl").then((maplibre) => {
      if (!containerRef.current) return;

      // Triangle + peak name marker
      const el = document.createElement("div");
      el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:3px;";
      el.innerHTML = `
        <div style="
          background:rgba(0,0,0,0.62);
          color:white;
          font-size:11px;
          font-weight:700;
          padding:2px 7px;
          border-radius:10px;
          white-space:nowrap;
          letter-spacing:0.01em;
        ">${peakName}</div>
        <svg width="20" height="18" viewBox="0 0 20 18" xmlns="http://www.w3.org/2000/svg">
          <polygon points="10,1 19,17 1,17" fill="#16a34a" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        </svg>`;

      const MAP_STYLE = {
        version: 8 as const,
        glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
        sources: {
          carto: {
            type: "raster" as const,
            tiles: [
              "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap © CARTO",
          },
        },
        layers: [{ id: "carto-tiles", type: "raster" as const, source: "carto" }],
      };

      map = new maplibre.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [longitude, latitude],
        zoom,
        pitch: 0,
        interactive: false,
        attributionControl: false,
      });

      map.on("load", () => {
        new maplibre.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(map);
      });
    });

    return () => {
      if (map) map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latStr = `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? "E" : "W"}`;

  return (
    <div style={{ position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: 107, display: "block" }} />
      <div style={{
        position: "absolute", bottom: 6, right: 6,
        background: "rgba(255,255,255,0.88)", backdropFilter: "blur(4px)",
        borderRadius: 8, padding: "3px 8px",
        fontSize: 11, fontWeight: 600, color: "#374151",
        pointerEvents: "none",
      }}>
        {latStr} · {lngStr}
      </div>
    </div>
  );
}
