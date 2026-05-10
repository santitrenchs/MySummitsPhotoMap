"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

function HeroCard() {
  return (
    <div
      style={{
        width: 248,
        height: 356,
        borderRadius: 20,
        background: "linear-gradient(160deg, #1B2A4A 0%, #0D1525 50%, #070B14 100%)",
        border: "1px solid rgba(255, 215, 0, 0.35)",
        boxShadow:
          "0 0 80px rgba(255, 215, 0, 0.22), 0 0 160px rgba(255, 215, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.12)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "18px 18px 20px",
        animation: "ld-float 5s ease-in-out infinite",
        flexShrink: 0,
      }}
    >
      {/* Corner glow */}
      <div
        style={{
          position: "absolute",
          top: -40,
          left: "50%",
          transform: "translateX(-50%)",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,215,0,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Rarity badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            background: "rgba(255, 215, 0, 0.12)",
            border: "1px solid rgba(255, 215, 0, 0.35)",
            borderRadius: 100,
            padding: "3px 10px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#FFD700",
            fontFamily: "var(--font-space, sans-serif)",
            textTransform: "uppercase",
          }}
        >
          ❄ Snow Lotus
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,215,0,0.6)", fontFamily: "var(--font-mono-landing, monospace)" }}>
          #0001
        </span>
      </div>

      {/* Mountain visual */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Glow behind mountain */}
        <div
          style={{
            position: "absolute",
            width: 130,
            height: 130,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)",
            animation: "ld-glow-pulse 3s ease-in-out infinite",
          }}
        />
        {/* Mountain SVG */}
        <svg
          width="130"
          height="100"
          viewBox="0 0 130 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Back peak */}
          <path
            d="M75 80 L105 20 L135 80Z"
            fill="rgba(255,215,0,0.06)"
            stroke="rgba(255,215,0,0.15)"
            strokeWidth="1"
          />
          {/* Main peak */}
          <path
            d="M-5 100 L65 4 L135 100Z"
            fill="none"
            stroke="rgba(255,215,0,0.5)"
            strokeWidth="1.5"
          />
          {/* Snow cap */}
          <path
            d="M65 4 L48 38 L65 32 L82 38Z"
            fill="rgba(255,255,255,0.9)"
            stroke="rgba(255,215,0,0.6)"
            strokeWidth="0.5"
          />
          {/* Shading */}
          <path
            d="M65 4 L48 38 L65 32Z"
            fill="rgba(255,255,255,0.5)"
          />
        </svg>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "rgba(255,215,0,0.15)",
          margin: "12px 0",
        }}
      />

      {/* Peak info */}
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "var(--font-space, sans-serif)",
            color: "#F0F4FF",
            letterSpacing: "-0.02em",
            marginBottom: 4,
          }}
        >
          Mont Blanc
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 500,
              fontFamily: "var(--font-mono-landing, monospace)",
              color: "#FFD700",
              letterSpacing: "-0.02em",
            }}
          >
            4.808 m
          </span>
          <span style={{ fontSize: 11, color: "rgba(240,244,255,0.45)" }}>
            🇫🇷 Francia
          </span>
        </div>
        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "#FFD700",
              fontFamily: "var(--font-mono-landing, monospace)",
              background: "rgba(255,215,0,0.1)",
              borderRadius: 4,
              padding: "2px 6px",
            }}
          >
            1.000 EP
          </span>
          <span style={{ fontSize: 10, color: "rgba(240,244,255,0.4)" }}>
            Capturada por Santi
          </span>
        </div>
      </div>
    </div>
  );
}

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
        display: "flex",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(165deg, #F0F4F8 0%, #FFFFFF 55%, #F4F7FA 100%)",
        paddingTop: 80,
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "10%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220,38,38,0.06) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "5%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Mountain silhouette at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 220,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 1440 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%", display: "block" }}
          preserveAspectRatio="none"
        >
          <path
            d="M0 220 L0 160 L80 120 L160 155 L260 80 L340 130 L440 40 L520 100 L600 60 L680 110 L760 30 L840 90 L920 50 L1000 120 L1100 70 L1180 130 L1260 90 L1360 150 L1440 110 L1440 220Z"
            fill="rgba(13,37,56,0.07)"
          />
          <path
            d="M0 220 L0 180 L100 155 L200 175 L320 110 L400 150 L500 90 L570 130 L640 105 L720 145 L800 80 L870 120 L940 100 L1020 140 L1120 95 L1200 140 L1300 115 L1380 155 L1440 130 L1440 220Z"
            fill="rgba(13,37,56,0.12)"
          />
        </svg>
      </div>

      <div className="ld-container" style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 60,
            justifyContent: "space-between",
          }}
          className="ld-hero-inner"
        >
          {/* Left: Text */}
          <div style={{ flex: 1, maxWidth: 600 }}>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(220, 38, 38, 0.1)",
                border: "1px solid rgba(220, 38, 38, 0.28)",
                borderRadius: 100,
                padding: "6px 14px",
                marginBottom: 32,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#DC2626",
                  display: "inline-block",
                  animation: "ld-pulse-ring 2s infinite",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#DC2626",
                  fontFamily: "var(--font-space, sans-serif)",
                  letterSpacing: "0.04em",
                }}
              >
                Early Access — Únete a los primeros exploradores
              </span>
            </div>

            {/* Headline */}
            <div ref={titleRef}>
              <h1
                className="ld-display"
                style={{
                  fontSize: "clamp(42px, 6.5vw, 80px)",
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
                <span
                  className="hero-line"
                  style={{
                    display: "block",
                    color: "#DC2626",
                  }}
                >
                  Conviértete en
                </span>
                <span
                  className="hero-line"
                  style={{
                    display: "block",
                    color: "#DC2626",
                  }}
                >
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
                maxWidth: 500,
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

            {/* Stats strip */}
            <div
              style={{
                display: "flex",
                gap: 32,
                marginTop: 48,
                paddingTop: 32,
                borderTop: "1px solid rgba(13,37,56,0.08)",
              }}
              className="ld-hero-stats"
            >
              {[
                { value: "6", label: "Rarezas" },
                { value: "∞", label: "Cimas por capturar" },
                { value: "5", label: "Niveles de progresión" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    className="ld-mono"
                    style={{ fontSize: 28, fontWeight: 500, color: "#DC2626" }}
                  >
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(13,37,56,0.45)", marginTop: 2 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Floating card */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexShrink: 0,
            }}
            className="ld-hero-card-wrap"
          >
            <HeroCard />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .ld-hero-inner {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 40px !important;
          }
          .ld-hero-card-wrap {
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .ld-hero-stats {
            gap: 20px !important;
          }
        }
      `}</style>
    </section>
  );
}
