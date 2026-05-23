"use client";
import dynamic from "next/dynamic";

const GeoposicionClient = dynamic(() => import("./GeoposicionClient"), { ssr: false });

export default function GeoposicionPage() {
  return (
    <div style={{ margin: -32, overflow: "hidden" }}>
      <GeoposicionClient />
    </div>
  );
}
