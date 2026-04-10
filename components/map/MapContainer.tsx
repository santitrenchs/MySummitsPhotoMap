"use client";

import dynamic from "next/dynamic";
import type { MapPeak } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-gray-100">
      <p className="text-sm text-gray-400">Loading map…</p>
    </div>
  ),
});

export default function MapContainer({
  peaks,
  ascentedPeakIds = [],
}: {
  peaks: MapPeak[];
  ascentedPeakIds?: string[];
}) {
  return <MapView peaks={peaks} ascentedPeakIds={ascentedPeakIds} />;
}
