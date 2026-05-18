"use client";

import Image from "next/image";

// Colour by altitude (matches lib/rarity.ts thresholds)
function rarityColor(altM: number): string {
  if (altM >= 3000) return "#0E7490"; // Tundra
  if (altM >= 2000) return "#1E40AF"; // Gentian
  if (altM >= 1000) return "#06B6D4"; // Heather
  return "#00995C";                   // Daisy
}

// Map bounds: W=-2.939 E=2.335 N=43.423 S=41.970 (zoom 8, 1920×720)
// xPct = (lng + 2.939) / 5.274 * 100
// yPct = (43.423 - lat) / 1.453 * 100
//
// Curated selection — well-spaced, covering the full visible map area including
// the pre-Pyrenean lower zone (yPct 65–85) that was previously empty.
const PEAKS: {
  id: string; name: string; altM: number;
  xPct: number; yPct: number; captured?: boolean;
}[] = [
  // ── North strip ──────────────────────────────────────────────────
  { id: "midi-big",    name: "Pic du Midi de Bigorre", altM: 2877, xPct: 58.4, yPct: 24.6 },
  { id: "neouvielle",  name: "Pic de Néouvielle",      altM: 3091, xPct: 60.5, yPct: 39.4 },

  // ── Main ridge ───────────────────────────────────────────────────
  { id: "vignemale",   name: "Vignemale",              altM: 3298, xPct: 53.0, yPct: 44.8 },
  { id: "perdido",     name: "Monte Perdido",          altM: 3355, xPct: 56.4, yPct: 51.0, captured: true },
  { id: "posets",      name: "Posets",                 altM: 3375, xPct: 63.9, yPct: 53.1 },
  { id: "aneto",       name: "Aneto",                  altM: 3404, xPct: 68.2, yPct: 54.5, captured: true },
  { id: "estats",      name: "Pica d'Estats",          altM: 3143, xPct: 82.3, yPct: 52.0, captured: true },

  // ── Upper right (Ariège / Cerdanya) ─────────────────────────────
  { id: "monges",      name: "Pic des Monges",         altM: 2831, xPct: 83.0, yPct: 32.1 },
  { id: "cabanette",   name: "Pic de la Cabanette",    altM: 2853, xPct: 88.6, yPct: 40.4 },
  { id: "madres",      name: "Pic de Madrès",          altM: 2469, xPct: 98.7, yPct: 43.4 },

  // ── Mid zone ─────────────────────────────────────────────────────
  { id: "peguera",     name: "Pic de Peguera",         altM: 2983, xPct: 74.0, yPct: 60.9 },
  { id: "carlit",      name: "Carlit",                 altM: 2921, xPct: 92.1, yPct: 58.3 },

  // ── Pre-Pyrenees / lower ─────────────────────────────────────────
  { id: "cotiella",    name: "Cotiella",               altM: 2912, xPct: 62.1, yPct: 64.8 },
  { id: "turbon",      name: "Turbón",                 altM: 2492, xPct: 65.5, yPct: 71.3 },
  { id: "tossa",       name: "Tossa Plana de Lles",    altM: 2916, xPct: 88.0, yPct: 67.6 },
  { id: "puigmal",     name: "Puigmal",                altM: 3001, xPct: 95.7, yPct: 71.5 },
  { id: "pedraforca",  name: "Pedraforca",             altM: 2497, xPct: 87.5, yPct: 81.6 },
];

// Mobile: only show peaks in the visible crop (objectPosition "65% center")
const MOBILE_VISIBLE = new Set([
  "perdido", "aneto", "posets", "peguera", "cotiella", "turbon",
]);

export default function HeroMap() {
  return (
    <>
      {/* Static map image */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Image
          src="/images/hero-pyrenees.jpg"
          alt="Mapa de los Pirineos"
          fill
          style={{ objectFit: "cover", objectPosition: "65% center" }}
          priority
          quality={90}
        />
      </div>

      {/* Peak markers — filter xPct ≥ 52 to keep clear of the hero text on the left */}
      <div className="hero-markers-container" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {PEAKS.filter((p) => p.xPct >= 52).map((peak) => {
        const color = peak.captured ? "#22c55e" : rarityColor(peak.altM);
        const altLabel = peak.altM >= 1000
          ? `${Math.floor(peak.altM / 1000)}.${String(peak.altM % 1000).padStart(3, "0")} m`
          : `${peak.altM} m`;

        return (
          <div
            key={peak.id}
            className={`hero-marker hero-marker-${peak.id}${MOBILE_VISIBLE.has(peak.id) ? " hero-marker-mobile" : ""}`}
            style={{
              position: "absolute",
              left: `${peak.xPct}%`,
              top: `${peak.yPct}%`,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              zIndex: 5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            {/* Text label — plain text, no pill */}
            <div style={{ textAlign: "center", lineHeight: 1.25 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#0D2538",
                whiteSpace: "nowrap",
                fontFamily: "system-ui, -apple-system, sans-serif",
                textShadow:
                  "0 0 4px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.85), 0 1px 2px rgba(255,255,255,0.8)",
              }}>
                {peak.name}
              </div>
              <div style={{
                fontSize: 9,
                fontWeight: 500,
                color: "#475569",
                whiteSpace: "nowrap",
                fontFamily: "system-ui, -apple-system, sans-serif",
                textShadow: "0 0 4px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.8)",
              }}>
                {altLabel}
              </div>
            </div>

            {/* Dot — radar rings: estats on desktop, aneto on tablet */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {(peak.id === "estats" || peak.id === "aneto") && (
                <>
                  <div className={`radar-ring radar-ring-1 radar-${peak.id}`} style={{ borderColor: color }} />
                  <div className={`radar-ring radar-ring-2 radar-${peak.id}`} style={{ borderColor: color }} />
                  <div className={`radar-ring radar-ring-3 radar-${peak.id}`} style={{ borderColor: color }} />
                </>
              )}
              <div style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: color,
                border: "1.5px solid rgba(255,255,255,0.9)",
                boxShadow: `0 1px 4px rgba(0,0,0,0.25), 0 0 0 1px ${color}55`,
                position: "relative",
                zIndex: 2,
              }} />
            </div>
          </div>
        );
      })}
      </div>

      <style>{`
        @keyframes heroMapPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(3);   opacity: 0; }
          100% { transform: scale(3);   opacity: 0; }
        }

        @keyframes radarRing {
          0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.7; }
          100% { transform: translate(-50%, -50%) scale(8);   opacity: 0; }
        }
        .radar-ring {
          position: absolute;
          left: 50%; top: 50%;
          width: 9px; height: 9px;
          border-radius: 50%;
          border: 1.5px solid;
          animation: radarRing 2.4s ease-out infinite;
          pointer-events: none;
        }
        .radar-ring-1 { animation-delay: 0s; }
        .radar-ring-2 { animation-delay: 0.8s; }
        .radar-ring-3 { animation-delay: 1.6s; }

        /* Radar rings: estats default, aneto on tablet */
        .radar-aneto { display: none; }
        @media (min-width: 640px) and (max-width: 899px) {
          .radar-estats { display: none !important; }
          .radar-aneto  { display: block; }
        }

        /* Tablet: shift all markers 15% to the right so they clear the text */
        @media (min-width: 640px) and (max-width: 899px) {
          .hero-markers-container { transform: translateX(15%); }
        }

        /* Mobile: hide all markers by default, show only the mobile-visible set */
        @media (max-width: 680px) {
          .hero-marker { display: none !important; }
          .hero-marker-mobile { display: flex !important; }

          /* Push all markers below the gradient zone (which ends at 64% of viewport) */
          .hero-marker-perdido   { left: 10% !important; top: 68% !important; }
          .hero-marker-posets    { left: 38% !important; top: 72% !important; }
          .hero-marker-aneto     { left: 62% !important; top: 76% !important; }
          .hero-marker-peguera   { left: 84% !important; top: 80% !important; }
          .hero-marker-cotiella  { left: 22% !important; top: 82% !important; }
          .hero-marker-turbon    { left: 52% !important; top: 86% !important; }
        }
      `}</style>
    </>
  );
}
