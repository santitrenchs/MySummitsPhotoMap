"use client";

import dynamic from "next/dynamic";
import type { MapPeak, AscentMapEntry } from "./MapView";

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
  return <MapView peaks={peaks} ascentData={ascentData} />;
}
