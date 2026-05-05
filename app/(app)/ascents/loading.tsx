"use client";

import { useEffect, useState } from "react";
import { RARITIES as RARITY_DEFS } from "@/lib/rarity";

const RARITIES = RARITY_DEFS.map((r) => ({ main: r.color, dark: r.colorDark, label: r.label }));

export default function AscentsLoading() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % RARITIES.length), 700);
    return () => clearInterval(t);
  }, []);

  const { main, label } = RARITIES[idx];

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
          <path d="M15 3 Q20.5 9 15 15 Q9.5 9 15 3Z" fill={main} style={{ transition: "fill .3s ease" }}/>
          <path d="M26.4 11.3 Q22.4 18.4 15 15 Q19 7.9 26.4 11.3Z" fill={main} style={{ transition: "fill .3s ease" }}/>
          <path d="M22.1 24.7 Q14.1 23.1 15 15 Q23 16.6 22.1 24.7Z" fill={main} style={{ transition: "fill .3s ease" }}/>
          <path d="M7.9 24.7 Q7 16.6 15 15 Q15.9 23.1 7.9 24.7Z" fill={main} style={{ transition: "fill .3s ease" }}/>
          <path d="M3.6 11.3 Q11 7.9 15 15 Q7.6 18.4 3.6 11.3Z" fill={main} style={{ transition: "fill .3s ease" }}/>
          <path d="M15 3 Q20.5 9 15 15 Q9.5 9 15 3Z" fill="none" stroke={main} strokeWidth="0.8" opacity="0.5"/>
          <path d="M26.4 11.3 Q22.4 18.4 15 15 Q19 7.9 26.4 11.3Z" fill="none" stroke={main} strokeWidth="0.8" opacity="0.5"/>
          <path d="M22.1 24.7 Q14.1 23.1 15 15 Q23 16.6 22.1 24.7Z" fill="none" stroke={main} strokeWidth="0.8" opacity="0.5"/>
          <path d="M7.9 24.7 Q7 16.6 15 15 Q15.9 23.1 7.9 24.7Z" fill="none" stroke={main} strokeWidth="0.8" opacity="0.5"/>
          <path d="M3.6 11.3 Q11 7.9 15 15 Q7.6 18.4 3.6 11.3Z" fill="none" stroke={main} strokeWidth="0.8" opacity="0.5"/>
          <path d="M15 4.5 Q17.5 8 16 12 Q14 12 13 8 Q12 5.5 15 4.5Z" fill="white" opacity="0.3"/>
          <circle cx="15" cy="15" r="4" fill="white"/>
          <circle cx="15" cy="15" r="4" fill="none" stroke={main} strokeWidth="0.8" opacity="0.5"/>
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
