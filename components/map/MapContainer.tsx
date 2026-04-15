"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import type { MapPeak, AscentMapEntry } from "./MapView";
import LocationPrompt from "./LocationPrompt";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "calc(100svh - var(--top-nav-h, 3.5rem) - var(--bottom-nav-h, 0px))", background: "#f1f5f9",
    }}>
      <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading map…</p>
    </div>
  ),
});

export default function MapContainer({
  peaks,
  ascentData = [],
}: {
  peaks: MapPeak[];
  ascentData?: AscentMapEntry[];
}) {
  const [gpsPosition, setGpsPosition] = useState<{ lat: number; lon: number } | null>(null);
  const handleGpsAcquired = useCallback((pos: { lat: number; lon: number }) => {
    setGpsPosition(pos);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <MapView peaks={peaks} ascentData={ascentData} gpsPosition={gpsPosition} />
      <LocationPrompt onGpsAcquired={handleGpsAcquired} />
    </div>
  );
}
