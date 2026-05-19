"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import HeroMap from "./HeroMap";
import { useLandingT } from "./LandingLocaleContext";

export default function LandingHero() {
  const t = useLandingT();
  const registerHref = t.locale === "es" ? "/register" : `/${t.locale}/register`;
  const loginHref    = t.locale === "es" ? "/login"    : `/${t.locale}/login`;
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
                {t.hero_line1}
              </span>
              <span className="hero-line" style={{ display: "block", color: "var(--ld-gold)" }}>
                {t.hero_line2}
              </span>
              <span className="hero-line" style={{ display: "block", color: "#5A6E84" }}>
                {t.hero_line3}
              </span>
              <span className="hero-line" style={{ display: "block", color: "#2F7A5F" }}>
                {t.hero_line4}
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
            {t.hero_body}
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Link href={registerHref} className="ld-btn-primary" style={{ fontSize: 16, padding: "15px 32px" }}>
              {t.hero_cta}
            </Link>
          </div>

          <p className="ld-cta-micro ld-hero-micro" style={{ textAlign: "center", marginTop: 16 }}>
            {t.hero_micro}
          </p>
          <p style={{ textAlign: "center", marginTop: 10, margin: "10px 0 0", fontSize: 14 }}>
            <Link
              href={loginHref}
              style={{
                color: "rgba(13,37,56,0.5)",
                fontWeight: 500,
                fontFamily: "var(--font-space, sans-serif)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#0D2538"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(13,37,56,0.5)"; }}
            >
              {t.hero_login}
            </Link>
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
            padding-bottom: 56px !important;
          }
          /* Párrafo más corto */
          .ld-hero-sub {
            margin-bottom: 28px !important;
          }
          /* Micro-copy oculto en mobile para reducir altura de contenido */
          .ld-hero-micro {
            display: none !important;
          }
          /* Gradiente: blanco sólido encima del texto → fade bajo el CTA → transparente */
          /* Contenido ocupa ~52% del viewport → fade 52–68% → mapa visible 68%+ */
          .ld-hero-gradient {
            background: linear-gradient(
              to bottom,
              rgba(255,255,255,1)    0%,
              rgba(255,255,255,1)   52%,
              rgba(255,255,255,0.6) 62%,
              rgba(255,255,255,0)   72%
            ) !important;
          }
        }

        /* Tablet */
        @media (min-width: 640px) and (max-width: 899px) {
          .ld-hero-section { min-height: 72svh !important; }
          .ld-hero-micro { text-align: center !important; }
        }

        /* Tablet: extender el blanco horizontal hasta el 55% para que el mapa no solape el texto */
        @media (min-width: 640px) and (max-width: 899px) {
          .ld-hero-gradient {
            background: linear-gradient(
              to right,
              #FFFFFF 0%,
              #FFFFFF 55%,
              rgba(255,255,255,0.80) 67%,
              rgba(255,255,255,0.25) 78%,
              rgba(255,255,255,0)   88%
            ) !important;
          }
        }
      `}</style>
    </section>
  );
}
