"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import HeroMap from "./HeroMap";

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
      className="ld-hero-section"
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
      {/* z-index: 2 so it sits above the map tiles but markers (z:10) pierce through */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, #FFFFFF 0%, #FFFFFF 30%, rgba(255,255,255,0.90) 45%, rgba(255,255,255,0.45) 60%, rgba(255,255,255,0) 75%)",
          zIndex: 2,
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
        className="ld-container ld-hero-content"
        style={{ position: "relative", zIndex: 6, paddingTop: 80, paddingBottom: 60 }}
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
              <span className="hero-line" style={{ display: "block", color: "#0D2538" }}>
                Captura cimas.
              </span>
              <span className="hero-line" style={{ display: "block", color: "var(--ld-gold)" }}>
                Colecciona rarezas.
              </span>
              <span className="hero-line" style={{ display: "block", color: "#5A6E84" }}>
                Conviértete en
              </span>
              <span className="hero-line" style={{ display: "block", color: "#2F7A5F" }}>
                Legendario.
              </span>
            </h1>
          </div>

          <p
            className="ld-hero-sub"
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

          <p className="ld-cta-micro ld-hero-micro" style={{ textAlign: "left", marginTop: 16 }}>
            Sin tarjeta de crédito · Gratis para empezar
          </p>
        </div>
      </div>

      <style>{`
        /* ── Mobile hero layout ── */
        @media (max-width: 680px) {
          /* Texto pegado arriba */
          .ld-hero-section {
            align-items: flex-start !important;
          }
          /* Contenido más compacto en mobile para dejar sitio al mapa */
          .ld-hero-content {
            padding-top: 68px !important;
            padding-bottom: 0 !important;
          }
          /* Párrafo más corto */
          .ld-hero-sub {
            margin-bottom: 28px !important;
          }
          /* Micro-copy oculto en mobile para reducir altura de contenido */
          .ld-hero-micro {
            display: none !important;
          }
          /* Gradiente: blanco sólido encima del texto → fade en botones → transparente */
          /* Contenido ocupa ~44% del viewport → fade 44–60% → mapa visible 60%+ */
          .ld-hero-gradient {
            background: linear-gradient(
              to bottom,
              rgba(255,255,255,1)    0%,
              rgba(255,255,255,1)   44%,
              rgba(255,255,255,0.6) 54%,
              rgba(255,255,255,0)   64%
            ) !important;
          }
        }
      `}</style>
    </section>
  );
}
