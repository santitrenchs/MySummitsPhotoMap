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
          // On desktop: center. On mobile (portrait): shift right so peaks
          // (located at 53-82% of the 1920px wide image) are in the visible crop.
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
            // ── Captured: green ring + name badge ──
            <>
              <div
                style={{
                  background: "rgba(255,255,255,0.97)",
                  border: "1px solid rgba(13,37,56,0.13)",
                  borderRadius: 999,
                  padding: "4px 10px 4px 7px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#0D2538",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 14px rgba(13,37,56,0.16)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 5,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#16A34A",
                    display: "inline-block",
                    flexShrink: 0,
                    boxShadow: "0 0 4px #16A34A80",
                  }}
                />
                <span>{peak.name}</span>
                <span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: 10 }}>
                  {peak.alt}
                </span>
              </div>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "rgba(22,163,74,0.12)",
                  border: "2.5px solid #16A34A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 0 4px rgba(22,163,74,0.12)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2.5 7L5.5 10L11.5 4"
                    stroke="#16A34A"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div
                style={{
                  width: 2,
                  height: 7,
                  background: "#16A34A",
                  opacity: 0.4,
                  borderRadius: "0 0 1px 1px",
                }}
              />
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
                <div
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    background: peak.color,
                    boxShadow: `0 0 10px ${peak.color}80`,
                    border: "2px solid rgba(255,255,255,0.95)",
                    position: "relative",
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    background: "white",
                    border: `1.5px solid ${peak.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 900,
                    color: peak.color,
                    lineHeight: 1,
                    zIndex: 2,
                    fontFamily: "system-ui,-apple-system,sans-serif",
                  }}
                >
                  +
                </div>
              </div>
              <div
                style={{
                  width: 2,
                  height: 6,
                  background: peak.color,
                  opacity: 0.35,
                  borderRadius: "0 0 1px 1px",
                }}
              />
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
         * Mobile: objectPosition is "65% center" → visible x range ≈ 53–71% of the
         * 1920px image. Peaks in that range (Vignemale 53%, Monte Perdido 56%, Posets 64%,
         * Aneto 68%) map to mobile viewport % as:
         *   mobile_x% = (peak_xPct - 53.5) / (71.0 - 53.5) * 100
         *   mobile_y% = peak_yPct  (y is ~1:1 since height nearly fills portrait)
         * We override left/top per-peak and hide the two that fall outside.
         */
        @media (max-width: 680px) {
          /* Re-position all markers for the mobile crop */
          .hero-marker { pointer-events: none; }

          /* Vignemale: desktop 53.0% → mobile ≈ -2.9% (just off left edge, hide) */
          .hero-marker-vignemale { display: none !important; }

          /* Monte Perdido: desktop 56.4% → mobile ≈ 16.6% */
          .hero-marker-monte-perdido { left: 17% !important; top: 51% !important; }

          /* Posets: desktop 63.9% → mobile ≈ 59.4% */
          .hero-marker-posets { left: 59% !important; top: 53% !important; }

          /* Aneto: desktop 68.2% → mobile ≈ 84.0% */
          .hero-marker-aneto { left: 84% !important; top: 55% !important; }

          /* Pica d'États: desktop 82.3% → mobile ≈ 165% (way off screen, hide) */
          .hero-marker-pica { display: none !important; }
        }
      `}</style>
    </>
  );
}
