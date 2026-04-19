"use client";
import dynamic from "next/dynamic";

const GeoposicionClient = dynamic(() => import("./GeoposicionClient"), { ssr: false });

export default function GeoposicionPage() {
  return <GeoposicionClient />;
}
