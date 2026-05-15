"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

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
];

const N = RARITY_CYCLE.length;
// 5s per color × 9 colors = 45s total cycle
// ease-in-out per segment via per-stop timing function
const colorStops = RARITY_CYCLE
  .map((c, i) => `${Math.round((i / N) * 100)}% { color: ${c}; animation-timing-function: ease-in-out; }`)
  .join("\n  ");
const glowStops = RARITY_CYCLE
  .map((c, i) => `${Math.round((i / N) * 100)}% { background-color: ${c}; animation-timing-function: ease-in-out; }`)
  .join("\n  ");

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
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        padding: "80px 0",
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
        .cta-flower {
          display: block;
          font-size: 56px;
          line-height: 1;
          font-family: sans-serif;
          opacity: 0.9;
          animation: flower-color 45s linear infinite;
        }
        .cta-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          filter: blur(24px);
          opacity: 0.18;
          animation: glow-color 45s linear infinite;
          pointer-events: none;
        }
      `}</style>

      <div className="ld-container" style={{ position: "relative", zIndex: 2, width: "100%" }}>
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
          {/* Single minimal flower */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 56 }}>
            <div className="cta-glow" />
            <span className="cta-flower">✿</span>
          </div>

          {/* Headline */}
          <h2
            className="ld-display"
            style={{
              fontSize: "clamp(40px, 6.5vw, 80px)",
              margin: "0 0 48px",
              lineHeight: 1.05,
              color: "rgba(240,244,255,0.92)",
            }}
          >
            Toda colección empieza con una cima.
          </h2>

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
            Captura tu primera Daisy →
          </Link>

          <p className="ld-cta-micro" style={{ marginTop: 16 }}>
            Sin tarjeta de crédito · Empieza en 1 minuto
          </p>
        </div>
      </div>
    </section>
  );
}
