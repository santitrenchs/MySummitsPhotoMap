"use client";

import { useEffect, useState } from "react";
import { RARITIES as RARITY_DEFS } from "@/lib/rarity";

const RARITIES = RARITY_DEFS.map((r) => ({ color: r.color, label: r.label }));

export default function MapLoading() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % RARITIES.length), 700);
    return () => clearInterval(t);
  }, []);

  const { color, label } = RARITIES[idx];

  return (
    <>
      <style>{`
        @keyframes rarity-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.15); }
        }
        @media (max-width: 639px) {
          .loading-inner { transform: translateX(-3vw); }
        }
      `}</style>
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "calc(100svh - var(--top-nav-h, 0px) - var(--bottom-nav-h, 0px))",
      }}>
        <div className="loading-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 56, lineHeight: 1,
            color, opacity: 0.5,
            animation: "rarity-pulse 1.4s ease-in-out infinite",
            transition: "color .3s ease",
            display: "block",
          }}>
            ✿
          </span>
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: ".04em",
            color, opacity: 0.45,
            transition: "color .3s ease",
          }}>
            {label}
          </span>
        </div>
      </div>
    </>
  );
}
