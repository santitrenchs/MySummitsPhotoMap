"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const HeroMap = dynamic(() => import("./HeroMap"), { ssr: false });

export default function LandingHero() {
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const spans = el.querySelectorAll<HTMLElement>(".hero-line");
    spans.forEach((span, i) => {
      span.style.opacity = "0";
      span.style.transform = "translateY(28px)";
      setTimeout(() => {
        span.style.transition = "opacity 0.7s ease, transform 0.7s ease";
        span.style.opacity = "1";
        span.style.transform = "translateY(0)";
      }, 200 + i * 140);
    });
  }, []);

  return (
    <section
      style={{
        minHeight: "100svh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* ── Full-bleed map background ── */}
      <HeroMap />

      {/* ── Left-to-right gradient: opaque white → transparent ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, #FFFFFF 0%, #FFFFFF 32%, rgba(255,255,255,0.92) 48%, rgba(255,255,255,0.55) 62%, rgba(255,255,255,0) 78%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
        className="ld-hero-gradient"
      />

      {/* ── Top fade so the nav doesn't clash with the map ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          background: "linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, transparent 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* ── Bottom fade into stats section ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: "linear-gradient(to top, #FFFFFF 0%, transparent 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* ── Text content ── */}
      <div
        className="ld-container"
        style={{ position: "relative", zIndex: 2, paddingTop: 80, paddingBottom: 60 }}
      >
        <div style={{ maxWidth: 560 }}>
          {/* Headline */}
          <div ref={titleRef}>
            <h1
              className="ld-display"
              style={{
                fontSize: "clamp(40px, 6vw, 76px)",
                margin: "0 0 24px",
                lineHeight: 1.02,
              }}
            >
              <span className="hero-line" style={{ display: "block" }}>
                Captura cimas.
              </span>
              <span className="hero-line" style={{ display: "block" }}>
                Colecciona rarezas.
              </span>
              <span className="hero-line" style={{ display: "block", color: "#DC2626" }}>
                Conviértete en
              </span>
              <span className="hero-line" style={{ display: "block", color: "#DC2626" }}>
                Legendario.
              </span>
            </h1>
          </div>

          <p
            style={{
              fontSize: "clamp(16px, 2vw, 19px)",
              color: "#5A6E84",
              lineHeight: 1.6,
              margin: "0 0 40px",
              maxWidth: 480,
            }}
          >
            Peakadex convierte cada ascensión real en una carta coleccionable.
            Tu historia de montaña, convertida en leyenda.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/register" className="ld-btn-primary" style={{ fontSize: 16, padding: "15px 32px" }}>
              Empieza tu colección →
            </Link>
            <button
              onClick={() => {
                document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="ld-btn-ghost"
              style={{ fontSize: 15 }}
            >
              Ver cómo funciona
            </button>
          </div>

          <p className="ld-cta-micro" style={{ textAlign: "left", marginTop: 16 }}>
            Sin tarjeta de crédito · Gratis para empezar
          </p>
        </div>
      </div>

      <style>{`
        /* On mobile: stronger gradient so text is always legible over the map */
        @media (max-width: 680px) {
          .ld-hero-gradient {
            background: linear-gradient(
              to bottom,
              rgba(255,255,255,0.98) 0%,
              rgba(255,255,255,0.95) 60%,
              rgba(255,255,255,0.7) 80%,
              rgba(255,255,255,0) 100%
            ) !important;
          }
        }
      `}</style>
    </section>
  );
}
