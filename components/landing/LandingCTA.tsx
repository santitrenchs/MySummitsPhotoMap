"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { RARITIES } from "@/lib/rarity";

export default function LandingCTA() {
  const sectionRef = useRef<HTMLElement>(null);
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
      { threshold: 0.2 }
    );
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, #0D1A28 0%, #07111E 40%, #0B1120 100%)",
        padding: "120px 0 100px",
      }}
    >
      {/* Background glows */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(220,38,38,0.08) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "20%",
          width: 400,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: "15%",
          width: 300,
          height: 250,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Mountain silhouette */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 180,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <svg
          viewBox="0 0 1440 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%", display: "block" }}
          preserveAspectRatio="none"
        >
          <path
            d="M0 180 L0 140 L120 90 L200 120 L320 50 L420 100 L520 30 L600 80 L680 20 L760 70 L840 10 L920 60 L1000 30 L1080 80 L1160 40 L1280 110 L1380 70 L1440 100 L1440 180Z"
            fill="rgba(7,11,20,0.6)"
          />
          <path
            d="M0 180 L0 160 L180 130 L300 155 L440 100 L520 135 L620 80 L700 120 L780 90 L860 130 L960 75 L1040 110 L1120 85 L1220 125 L1320 95 L1440 140 L1440 180Z"
            fill="rgba(7,11,20,0.85)"
          />
        </svg>
      </div>

      <div className="ld-container" style={{ position: "relative", zIndex: 2 }}>
        <div
          ref={contentRef}
          style={{
            textAlign: "center",
            maxWidth: 680,
            margin: "0 auto",
            opacity: 0,
            transform: "translateY(32px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          {/* Rarities preview row — ✿ symbols in rarity colors */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              marginBottom: 48,
              flexWrap: "wrap",
            }}
          >
            {RARITIES.map((r) => (
              <div
                key={r.id}
                title={r.label}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: `${r.color}18`,
                  border: `1.5px solid ${r.color}45`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 19,
                  color: r.color,
                  boxShadow: `0 0 14px ${r.color}22`,
                  fontFamily: "sans-serif",
                }}
              >
                ✿
              </div>
            ))}
            {/* Mythic */}
            <div
              title="Mythic"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,215,0,0.12)",
                border: "1.5px solid rgba(255,215,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                boxShadow: "0 0 14px rgba(255,215,0,0.2)",
              }}
            >
              ⭐
            </div>
          </div>

          {/* Headline */}
          <h2
            className="ld-display"
            style={{
              fontSize: "clamp(36px, 6vw, 68px)",
              margin: "0 0 20px",
              lineHeight: 1.08,
              color: "rgba(240,244,255,0.92)",
            }}
          >
            Tu leyenda no empieza
            <br />
            en la cima.
            <br />
            <span style={{ color: "#4ade80" }}>Empieza aquí.</span>
          </h2>

          <p
            style={{
              fontSize: 17,
              color: "rgba(240,244,255,0.55)",
              lineHeight: 1.65,
              margin: "0 auto 44px",
              maxWidth: 520,
            }}
          >
            Miles de cimas esperan ser capturadas. Tu colección está vacía.
            Tu cordada te espera.
            <br />
            El único paso que falta eres tú.
          </p>

          {/* CTA */}
          <Link
            href="/register"
            className="ld-btn-primary"
            style={{
              fontSize: 17,
              padding: "17px 40px",
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
