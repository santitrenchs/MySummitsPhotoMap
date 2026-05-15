"use client";

import { useEffect, useRef } from "react";
import { useLandingT } from "./LandingLocaleContext";

const RARITIES = [
  { id: "daisy",      name: "Daisy",      emoji: "✿", color: "#00995C", altRange: "0 – 999 m",         description: "La entrada al mundo de los coleccionistas",  ep: "10 EP"    },
  { id: "heather",    name: "Heather",    emoji: "✿", color: "#06B6D4", altRange: "1.000 – 1.999 m",   description: "Brezales y valles de montaña",               ep: "20 EP"    },
  { id: "gentian",    name: "Gentian",    emoji: "✿", color: "#1E40AF", altRange: "2.000 – 2.999 m",   description: "Terreno alpino. Ya no es un paseo",           ep: "30 EP"    },
  { id: "tundra",     name: "Tundra",     emoji: "✿", color: "#0E7490", altRange: "3.000 – 3.999 m",   description: "Zona de tundra alpina. El paisaje cambia",    ep: "60 EP"    },
  { id: "edelweiss",  name: "Edelweiss",  emoji: "✿", color: "#A855F7", altRange: "4.000 – 4.999 m",   description: "Alta montaña. Donde empieza la leyenda",      ep: "120 EP"   },
  { id: "draba",      name: "Draba",      emoji: "✿", color: "#EC4899", altRange: "5.000 – 5.999 m",   description: "Una de las flores más altas del mundo",       ep: "250 EP"   },
  { id: "saxifrage",  name: "Saxifrage",  emoji: "✿", color: "#F97316", altRange: "6.000 – 6.999 m",   description: "Expedición. Pocos llegan hasta aquí",         ep: "500 EP"   },
  { id: "cinquefoil", name: "Cinquefoil", emoji: "✿", color: "#EAB308", altRange: "7.000 – 7.999 m",   description: "Death zones. Solo los elegidos",              ep: "1.000 EP" },
  { id: "snowlotus",  name: "Snow Lotus", emoji: "✿", color: "#94A3B8", altRange: "≥ 8.000 m",         description: "8000ers. El olimpo del coleccionismo",        ep: "2.000 EP" },
];

export default function LandingRarities({ peakCounts }: { peakCounts: Record<string, number> }) {
  const t = useLandingT();
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
        background: "linear-gradient(180deg, #FFFFFF 0%, #F4F7FA 50%, #FFFFFF 100%)",
      }}
    >
      <div className="ld-container">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div className="ld-section-label">{t.rarities_section_label}</div>
          <h2 className="ld-display ld-section-title" style={{ textAlign: "center" }}>
            {t.rarities_title}
            <br />
            <span style={{ color: "var(--ld-gold)" }}>{t.rarities_title_gold}</span>
          </h2>
          <p
            className="ld-section-sub"
            style={{ textAlign: "center", margin: "0 auto" }}
          >
            {t.rarities_body}
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
                background: "#FFFFFF",
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
                el.style.boxShadow = `0 0 48px ${r.color}1A, 0 4px 24px rgba(13,37,56,0.08)`;
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

              {/* Icon + Name inline */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 28, lineHeight: 1, color: r.color, flexShrink: 0 }}>{r.emoji}</span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "var(--font-space, sans-serif)",
                    color: r.color,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {r.name}
                </span>
              </div>

              {/* Altitude range */}
              <div
                className="ld-mono"
                style={{
                  fontSize: 12,
                  color: "rgba(13,37,56,0.5)",
                  marginBottom: 10,
                }}
              >
                {r.altRange}
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(13,37,56,0.6)",
                  lineHeight: 1.5,
                  margin: "0 0 14px",
                }}
              >
                {t.rarities_descs[i]}
              </p>

              {/* EP badge + peak count */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                {peakCounts[r.id] > 0 && (
                  <span style={{
                    fontSize: 11,
                    color: "rgba(13,37,56,0.4)",
                    fontFamily: "var(--font-mono-landing, monospace)",
                  }}>
                    {peakCounts[r.id].toLocaleString(t.numberLocale)} {t.rarities_peaks_suffix}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom copy */}
        <div style={{ textAlign: "center", marginTop: 52 }}>
          <p style={{ fontSize: 14, color: "rgba(13,37,56,0.4)", marginBottom: 20 }}>
            {t.rarities_footer}
          </p>
          <a href="/register" className="ld-btn-primary" style={{ display: "inline-flex" }}>
            {t.rarities_cta}
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .ld-rarities-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 680px) {
          .ld-rarities-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
        }
        @media (max-width: 380px) {
          .ld-rarities-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
        }
      `}</style>
    </section>
  );
}
