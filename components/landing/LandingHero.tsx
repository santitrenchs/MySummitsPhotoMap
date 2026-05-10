"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const RARITY_COLOR = "#FFD700";

function MountainScene({ dark = false }: { dark?: boolean }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 260 325" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      {/* Sky gradient base */}
      <rect width="260" height="325" fill={dark ? "#0a1628" : "#1a2d4a"} />
      <rect width="260" height="325" fill="url(#skyGrad)" />
      {/* Stars (only front) */}
      {!dark && <>
        <circle cx="40" cy="30" r="1" fill="white" opacity="0.6"/>
        <circle cx="90" cy="15" r="0.8" fill="white" opacity="0.5"/>
        <circle cx="180" cy="25" r="1" fill="white" opacity="0.7"/>
        <circle cx="220" cy="40" r="0.7" fill="white" opacity="0.4"/>
        <circle cx="130" cy="10" r="1.2" fill="white" opacity="0.5"/>
      </>}
      {/* Far mountains */}
      <path d="M0 200 L40 140 L80 170 L120 120 L160 155 L200 130 L240 160 L260 145 L260 325 L0 325Z" fill="#0d1e35" opacity="0.7"/>
      {/* Mid mountains */}
      <path d="M0 240 L30 180 L60 210 L100 160 L140 200 L180 170 L220 195 L260 175 L260 325 L0 325Z" fill="#0a1628" opacity="0.85"/>
      {/* Main peak — Mont Blanc */}
      <path d="M-20 325 L130 60 L280 325Z" fill="#13263d"/>
      {/* Snow cap */}
      <path d="M130 60 L95 130 L130 115 L165 130Z" fill="rgba(255,255,255,0.92)" />
      <path d="M130 60 L95 130 L130 115Z" fill="rgba(255,255,255,0.6)" />
      {/* Snow streaks */}
      <path d="M120 115 L110 145" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M142 118 L152 148" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Glow around peak */}
      <ellipse cx="130" cy="90" rx="60" ry="40" fill="url(#peakGlow)" opacity="0.4"/>
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1628"/>
          <stop offset="60%" stopColor="#1a3050" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#0d1e35" stopOpacity="0"/>
        </linearGradient>
        <radialGradient id="peakGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

function HeroCard() {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      style={{ perspective: 1200, width: 270, flexShrink: 0, cursor: "pointer" }}
      onClick={() => setFlipped(f => !f)}
    >
      <div
        style={{
          width: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          animation: "ld-float 5s ease-in-out infinite",
        }}
      >
        {/* ── FRONT ── */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: "#fff",
            borderRadius: 28,
            border: "1px solid rgba(13,37,56,0.07)",
            boxShadow: "0 1px 3px rgba(13,37,56,0.10), 0 20px 50px rgba(13,37,56,0.13)",
            padding: 10,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Image frame */}
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              position: "relative",
              aspectRatio: "4/5",
              background: "#1a2d4a",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
            }}
          >
            <MountainScene />

            {/* Dark gradient overlay at bottom */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "52%",
                background: "linear-gradient(to top, rgba(7,18,31,0.88) 0%, rgba(7,18,31,0.48) 55%, transparent 100%)",
                pointerEvents: "none",
              }}
            />

            {/* Rarity badge — top left */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                background: "rgba(255,215,0,0.92)",
                color: "#fff",
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: "0.12em",
                padding: "5px 10px",
                borderRadius: 999,
                boxShadow: "0 8px 24px rgba(255,215,0,0.35)",
                fontFamily: "var(--font-space, sans-serif)",
                textTransform: "uppercase",
              }}
            >
              ❄ Snow Lotus
            </div>

            {/* Peak info — overlaid bottom */}
            <div
              style={{
                position: "absolute",
                bottom: 14,
                left: 14,
                right: 14,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "-0.035em",
                  lineHeight: 1.05,
                  textShadow: "0 2px 8px rgba(0,0,0,0.45)",
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
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.86)",
                    textShadow: "0 1px 4px rgba(0,0,0,0.45)",
                  }}
                >
                  Vía normal por Goûter
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 5,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.72)", textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}>
                  22 jul 2023
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.72)", textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}>
                  🇫🇷 Francia
                </span>
              </div>
            </div>
          </div>

          {/* Stat band */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              margin: "8px 0 0",
            }}
          >
            {[
              { label: "Altitud", value: "4.808 m", color: RARITY_COLOR },
              { label: "Rareza", value: "❄ Snow Lotus", color: RARITY_COLOR },
              { label: "EP", value: "+1.000", color: "#FF5D2D" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  background: "#F8FAFC",
                  borderRadius: 12,
                  padding: "9px 8px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase", color: "#8A94A3", marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BACK ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "#07121f",
            borderRadius: 28,
            border: "1px solid rgba(255,215,0,0.2)",
            boxShadow: "0 1px 3px rgba(13,37,56,0.10), 0 20px 50px rgba(13,37,56,0.13)",
            padding: 10,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Terrain area */}
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              position: "relative",
              aspectRatio: "4/5",
              background: "#0a1628",
            }}
          >
            <MountainScene dark />

            {/* Dark overlay bottom */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "55%",
                background: "linear-gradient(to top, rgba(7,18,31,0.92) 0%, rgba(7,18,31,0.5) 55%, transparent 100%)",
                pointerEvents: "none",
              }}
            />

            {/* Data overlaid */}
            <div style={{ position: "absolute", bottom: 14, left: 14, right: 14, pointerEvents: "none" }}>
              {/* Coords */}
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)", textShadow: "0 1px 4px rgba(0,0,0,.4)", marginBottom: 5 }}>
                📍 45.8327° N · 6.8652° E
              </div>
              {/* Peak name */}
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, textShadow: "0 2px 8px rgba(0,0,0,.5)", marginBottom: 2 }}>
                Mont Blanc
              </div>
              {/* Altitude */}
              <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, textShadow: "0 2px 8px rgba(0,0,0,.4)" }}>
                4.808 m
              </div>
              {/* Range */}
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 3, textShadow: "0 1px 4px rgba(0,0,0,.4)" }}>
                Alpes · Francia / Italia
              </div>

              {/* Altitude progress bar */}
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.2)" }}>
                  <div style={{ height: "100%", width: "55%", borderRadius: 999, background: RARITY_COLOR }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>0 m</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>8.849 m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Back stats */}
          <div style={{ padding: "10px 4px 0" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: RARITY_COLOR, display: "inline-block" }} />
              Estadísticas Peakadex
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "Rareza", value: "❄ Snow Lotus" },
                { label: "EP ganados", value: "+1.000" },
                { label: "Fecha", value: "22 jul 2023" },
                { label: "Cordillera", value: "Alpes" },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: label === "EP ganados" ? "#FF5D2D" : "rgba(255,255,255,0.85)" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 11, color: "rgba(13,37,56,0.35)", marginTop: 10 }}>
        Toca para ver el reverso
      </p>
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
