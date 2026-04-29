"use client";

import { useEffect, useState } from "react";

const RARITIES = [
  { main: "#00995C", dark: "#00763d", label: "Daisy" },
  { main: "#7B5BA6", dark: "#5c4480", label: "Gentian" },
  { main: "#F97316", dark: "#c55e0a", label: "Edelweiss" },
  { main: "#EAB308", dark: "#a87e06", label: "Saxifrage" },
];

export default function HomeLoading() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % RARITIES.length), 700);
    return () => clearInterval(t);
  }, []);

  const { main, dark, label } = RARITIES[idx];

  return (
    <>
      <style>{`
        @keyframes ball-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "calc(100svh - var(--top-nav-h, 0px) - var(--bottom-nav-h, 0px))",
        gap: 12,
      }}>
        <svg
          width="64" height="64" viewBox="0 0 30 30"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            animation: "ball-spin 1.4s linear infinite",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,.18))",
            opacity: 0.45,
            transition: "fill .3s ease",
          }}
        >
          <circle cx="15" cy="15" r="13" fill="white" />
          <path d="M 2,15 A 13,13 0 0,1 28,15 Z" fill={main} style={{ transition: "fill .3s ease" }} />
          <circle cx="15" cy="15" r="13" fill="none" stroke={dark} strokeWidth="1.2" style={{ transition: "stroke .3s ease" }} />
          <rect x="1" y="13" width="28" height="4" fill="white" />
          <line x1="2" y1="15" x2="28" y2="15" stroke={dark} strokeWidth="1.2" style={{ transition: "stroke .3s ease" }} />
          <circle cx="15" cy="15" r="4.5" fill="white" stroke={dark} strokeWidth="1.5" style={{ transition: "stroke .3s ease" }} />
          <path d="M 6,8 A 13,13 0 0,1 24,8 Q 22,13 15,14 Q 8,13 6,8 Z" fill="white" opacity=".25" />
        </svg>
        <span style={{
          fontSize: 12, fontWeight: 700, letterSpacing: ".04em",
          color: main, opacity: 0.45,
          transition: "color .3s ease",
        }}>
          {label}
        </span>
      </div>
    </>
  );
}
