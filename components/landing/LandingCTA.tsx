"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

// Rarity colors in order — used for the flower animation cycle
const RARITY_CYCLE = [
  "#00995C", // Daisy
  "#06B6D4", // Heather
  "#1E40AF", // Gentian
  "#0E7490", // Tundra
  "#A855F7", // Edelweiss
  "#EC4899", // Draba
  "#F97316", // Saxifrage
  "#EAB308", // Cinquefoil
  "#94A3B8", // Snow Lotus
  "#FFD700", // Mythic
];

const pct = (i: number) => `${Math.round((i / RARITY_CYCLE.length) * 100)}%`;

// Build @keyframes strings dynamically
const colorStops = RARITY_CYCLE.map((c, i) => `${pct(i)} { color: ${c}; }`).join("\n  ");
const glowStops  = RARITY_CYCLE.map((c, i) => `${pct(i)} { background-color: ${c}; }`).join("\n  ");

export default function LandingCTA() {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          content.style.opacity = "1";
          content.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#07111E",
        padding: "130px 0 110px",
      }}
    >
      <style>{`
        @keyframes flower-color {
          ${colorStops}
          100% { color: ${RARITY_CYCLE[0]}; }
        }
        @keyframes glow-color {
          ${glowStops}
          100% { background-color: ${RARITY_CYCLE[0]}; }
        }
        @keyframes flower-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .cta-flower {
          display: block;
          font-size: 72px;
          line-height: 1;
          font-family: sans-serif;
          animation:
            flower-color 24s linear infinite,
            flower-spin  40s linear infinite;
        }
        .cta-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 320px;
          height: 320px;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.10;
          animation: glow-color 24s linear infinite;
          pointer-events: none;
        }
      `}</style>

      <div className="ld-container" style={{ position: "relative", zIndex: 2 }}>
        <div
          ref={contentRef}
          style={{
            textAlign: "center",
            maxWidth: 720,
            margin: "0 auto",
            opacity: 0,
            transform: "translateY(32px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          {/* Single animated flower */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 52 }}>
            <div className="cta-glow" />
            <span className="cta-flower">✿</span>
          </div>

          {/* Headline */}
          <h2
            className="ld-display"
            style={{
              fontSize: "clamp(44px, 7vw, 84px)",
              margin: "0 0 24px",
              lineHeight: 1.05,
              color: "rgba(240,244,255,0.92)",
            }}
          >
            Tu leyenda no empieza
            <br />
            en la cima.
            <br />
            <span style={{ color: "var(--ld-gold, #F5C842)" }}>Empieza aquí.</span>
          </h2>

          <p
            style={{
              fontSize: 17,
              color: "rgba(240,244,255,0.50)",
              lineHeight: 1.65,
              margin: "0 auto 48px",
              maxWidth: 480,
            }}
          >
            Miles de cimas esperan ser capturadas.
            <br />
            El único paso que falta eres tú.
          </p>

          {/* CTA */}
          <Link
            href="/register"
            className="ld-btn-primary"
            style={{
              fontSize: 17,
              padding: "17px 44px",
              display: "inline-flex",
            }}
          >
            Empieza tu colección — Es gratis →
          </Link>

          <p className="ld-cta-micro" style={{ marginTop: 16 }}>
            Sin tarjeta de crédito · Empieza en 1 minuto
          </p>
        </div>
      </div>
    </section>
  );
}
