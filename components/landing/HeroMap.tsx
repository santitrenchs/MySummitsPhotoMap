"use client";

import Image from "next/image";

// Real Pyrenean peaks — % positions pre-calculated from the static map image bounds:
// West: -2.939°, East: 2.335°, North: 43.423°, South: 41.970° (zoom 8, 1920×720)
const PEAKS = [
  {
    id: "vignemale",
    name: "Vignemale",
    alt: "3.298 m",
    rarity: "Edelweiss",
    rarityEmoji: "🌸",
    color: "#3B82F6",
    captured: false,
    xPct: 53.0,
    yPct: 44.8,
  },
  {
    id: "monte-perdido",
    name: "Monte Perdido",
    alt: "3.355 m",
    rarity: "Edelweiss",
    rarityEmoji: "🌸",
    color: "#3B82F6",
    captured: true,
    xPct: 56.4,
    yPct: 51.0,
  },
  {
    id: "posets",
    name: "Posets",
    alt: "3.375 m",
    rarity: "Edelweiss",
    rarityEmoji: "🌸",
    color: "#3B82F6",
    captured: false,
    xPct: 63.9,
    yPct: 53.1,
  },
  {
    id: "aneto",
    name: "Aneto",
    alt: "3.404 m",
    rarity: "Edelweiss",
    rarityEmoji: "🌸",
    color: "#3B82F6",
    captured: true,
    xPct: 68.2,
    yPct: 54.5,
  },
  {
    id: "pica",
    name: "Pica d'Estats",
    alt: "3.143 m",
    rarity: "Edelweiss",
    rarityEmoji: "🌸",
    color: "#3B82F6",
    captured: false,
    xPct: 82.3,
    yPct: 52.0,
  },
];

export default function HeroMap() {
  return (
    <>
      {/* Static map image — fills the entire hero section */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Image
          src="/images/hero-pyrenees.jpg"
          alt="Mapa de los Pirineos"
          fill
          // objectPosition "65% center" so the portrait crop on mobile focuses on the peaks
          style={{ objectFit: "cover", objectPosition: "65% center" }}
          priority
          quality={90}
        />
      </div>

      {/* Peak markers — absolutely positioned using pre-calculated % coordinates */}
      {PEAKS.map((peak) => (
        <div
          key={peak.name}
          className={`hero-marker hero-marker-${peak.id}`}
          style={{
            position: "absolute",
            left: `${peak.xPct}%`,
            top: `${peak.yPct}%`,
            transform: "translateX(-50%) translateY(-100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "none",
            zIndex: 5,
            gap: 0,
          }}
        >
          {peak.captured ? (
            // ── Captured: same circular photo marker as the real app map ──
            // App: 44px circle, border 2.5px white, box-shadow = green ring + drop shadow
            <>
              {/* Name badge above */}
              <div
                style={{
                  background: "rgba(255,255,255,0.97)",
                  border: "1px solid rgba(13,37,56,0.10)",
                  borderRadius: 999,
                  padding: "3px 9px 3px 6px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#0D2538",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 10px rgba(13,37,56,0.12)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 6,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#22c55e", display: "inline-block", flexShrink: 0,
                }} />
                <span>{peak.name}</span>
                <span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: 10 }}>
                  {peak.alt}
                </span>
              </div>

              {/* Circle — matches app MapView marker exactly */}
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2.5px solid white",
                boxShadow: "0 0 0 3.5px #22c55e, 0 4px 16px rgba(0,0,0,0.32)",
                background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                lineHeight: 1,
                userSelect: "none",
              }}>
                ⛰️
              </div>

              {/* Stem */}
              <div style={{
                width: 2, height: 6,
                background: "#22c55e", opacity: 0.5,
                borderRadius: "0 0 1px 1px", marginTop: 1,
              }} />
            </>
          ) : (
            // ── Uncaptured: rarity badge + pulsing dot + "+" icon ──
            <>
              <div
                style={{
                  background: "rgba(255,255,255,0.96)",
                  border: `1.5px solid ${peak.color}55`,
                  borderRadius: 999,
                  padding: "4px 10px 4px 7px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#0D2538",
                  whiteSpace: "nowrap",
                  boxShadow: `0 2px 14px ${peak.color}30`,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 5,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                <span>{peak.rarityEmoji}</span>
                <span style={{ color: peak.color, fontWeight: 700 }}>{peak.rarity}</span>
                <span style={{ color: "#D1D5DB", fontSize: 9 }}>·</span>
                <span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: 10 }}>
                  {peak.alt}
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  className="hero-map-pulse"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: `${peak.color}25`,
                  }}
                />
                <div style={{
                  width: 13, height: 13, borderRadius: "50%",
                  background: peak.color,
                  boxShadow: `0 0 10px ${peak.color}80`,
                  border: "2px solid rgba(255,255,255,0.95)",
                  position: "relative", zIndex: 1,
                }} />
                <div style={{
                  position: "absolute", top: -3, right: -3,
                  width: 13, height: 13, borderRadius: "50%",
                  background: "white", border: `1.5px solid ${peak.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 900, color: peak.color,
                  lineHeight: 1, zIndex: 2,
                  fontFamily: "system-ui,-apple-system,sans-serif",
                }}>
                  +
                </div>
              </div>
              <div style={{
                width: 2, height: 6,
                background: peak.color, opacity: 0.35,
                borderRadius: "0 0 1px 1px",
              }} />
            </>
          )}
        </div>
      ))}

      <style>{`
        @keyframes heroMapPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(3);   opacity: 0; }
          100% { transform: scale(3);   opacity: 0; }
        }
        .hero-map-pulse {
          animation: heroMapPulse 2.2s ease-out infinite;
        }

        /**
         * Mobile (≤680px): objectPosition "65% center" → visible x ≈ 53–71% of image.
         * Markers repositioned with bottom-anchor so they sit in the visible map area
         * below the gradient. Vignemale + Pica hidden (outside crop).
         */
        @media (max-width: 680px) {
          .hero-marker { top: auto !important; }
          .hero-marker-vignemale { display: none !important; }
          .hero-marker-monte-perdido { left: 17% !important; bottom: 24% !important; }
          .hero-marker-posets       { left: 57% !important; bottom: 21% !important; }
          .hero-marker-aneto        { left: 82% !important; bottom: 18% !important; }
          .hero-marker-pica         { display: none !important; }
        }
      `}</style>
    </>
  );
}
