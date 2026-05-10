"use client";

import { useEffect, useRef } from "react";

const RARITIES = [
  {
    id: "daisy",
    name: "Daisy",
    emoji: "🌼",
    color: "#00995C",
    altRange: "< 1.500 m",
    description: "La entrada al mundo de los coleccionistas",
    ep: "8 EP",
  },
  {
    id: "gentian",
    name: "Gentian",
    emoji: "🪻",
    color: "#A855F7",
    altRange: "1.500 – 2.999 m",
    description: "Terreno alpino. Ya no es un paseo",
    ep: "16 EP",
  },
  {
    id: "edelweiss",
    name: "Edelweiss",
    emoji: "🌸",
    color: "#3B82F6",
    altRange: "3.000 – 4.999 m",
    description: "Alta montaña. Donde empieza la leyenda",
    ep: "20 EP",
  },
  {
    id: "saxifrage",
    name: "Saxifrage",
    emoji: "🔶",
    color: "#F97316",
    altRange: "5.000 – 6.999 m",
    description: "Expedición. Pocos llegan hasta aquí",
    ep: "100 EP",
  },
  {
    id: "cinquefoil",
    name: "Cinquefoil",
    emoji: "⭐",
    color: "#EAB308",
    altRange: "7.000 – 7.999 m",
    description: "Death zones. Solo los elegidos",
    ep: "500 EP",
  },
  {
    id: "snowlotus",
    name: "Snow Lotus",
    emoji: "❄️",
    color: "#FFD700",
    altRange: "≥ 8.000 m",
    description: "8000ers. El olimpo del coleccionismo",
    ep: "1.000 EP",
  },
];

export default function LandingRarities() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = grid.querySelectorAll<HTMLElement>(".rarity-card");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target as HTMLElement;
            const delay = Number(card.dataset.delay ?? 0);
            setTimeout(() => {
              card.style.opacity = "1";
              card.style.transform = "translateY(0) scale(1)";
            }, delay);
            observer.unobserve(card);
          }
        });
      },
      { threshold: 0.1 }
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="rarezas"
      className="ld-section"
      style={{
        background: "linear-gradient(180deg, #070B14 0%, #0A0F1E 50%, #070B14 100%)",
      }}
    >
      <div className="ld-container">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div className="ld-section-label">Sistema de rarezas</div>
          <h2 className="ld-display ld-section-title" style={{ textAlign: "center" }}>
            No todas las cimas son iguales.
            <br />
            <span style={{ color: "var(--ld-gold)" }}>La altitud determina la rareza.</span>
          </h2>
          <p
            className="ld-section-sub"
            style={{ textAlign: "center", margin: "0 auto" }}
          >
            Como las cartas legendarias, pero estas las ganas tú
            escalando montañas reales.
          </p>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
          className="ld-rarities-grid"
        >
          {RARITIES.map((r, i) => (
            <div
              key={r.id}
              className="rarity-card"
              data-delay={i * 80}
              style={{
                background: "var(--ld-bg-surface)",
                border: `1px solid ${r.color}30`,
                borderRadius: 16,
                padding: "28px 24px",
                position: "relative",
                overflow: "hidden",
                cursor: "default",
                opacity: 0,
                transform: "translateY(20px) scale(0.97)",
                transition: "opacity 0.55s ease, transform 0.55s ease, border-color 0.25s, box-shadow 0.25s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = `${r.color}70`;
                el.style.boxShadow = `0 0 48px ${r.color}1A, 0 4px 24px rgba(0,0,0,0.4)`;
                el.style.transform = "translateY(-4px) scale(1)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = `${r.color}30`;
                el.style.boxShadow = "none";
                el.style.transform = "translateY(0) scale(1)";
              }}
            >
              {/* Background glow */}
              <div
                style={{
                  position: "absolute",
                  top: -30,
                  right: -30,
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${r.color}12 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />

              {/* Emoji */}
              <div style={{ fontSize: 36, marginBottom: 14, lineHeight: 1 }}>{r.emoji}</div>

              {/* Name */}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: "var(--font-space, sans-serif)",
                  color: r.color,
                  marginBottom: 4,
                  letterSpacing: "-0.01em",
                }}
              >
                {r.name}
              </div>

              {/* Altitude range */}
              <div
                className="ld-mono"
                style={{
                  fontSize: 12,
                  color: "rgba(240,244,255,0.5)",
                  marginBottom: 10,
                }}
              >
                {r.altRange}
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(240,244,255,0.6)",
                  lineHeight: 1.5,
                  margin: "0 0 14px",
                }}
              >
                {r.description}
              </p>

              {/* EP badge */}
              <span
                style={{
                  display: "inline-block",
                  background: `${r.color}18`,
                  border: `1px solid ${r.color}35`,
                  borderRadius: 100,
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono-landing, monospace)",
                  color: r.color,
                  letterSpacing: "0.04em",
                }}
              >
                {r.ep}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom copy */}
        <div style={{ textAlign: "center", marginTop: 52 }}>
          <p style={{ fontSize: 14, color: "rgba(240,244,255,0.4)", marginBottom: 20 }}>
            Las Snow Lotus se cuentan con los dedos de las manos.
          </p>
          <a href="/register" className="ld-btn-primary" style={{ display: "inline-flex" }}>
            Empieza con una Daisy →
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .ld-rarities-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .ld-rarities-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </section>
  );
}
