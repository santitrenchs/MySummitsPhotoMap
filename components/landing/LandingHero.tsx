"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const DECK = [
  {
    peakName: "Mont Blanc",
    altitude: "4.808 m",
    country: "🇫🇷 Francia",
    rarity: "Snow Lotus",
    rarityEmoji: "❄",
    color: "#FFD700",
    ep: "+1.000",
    date: "22 jul 2023",
    route: "Vía normal por Goûter",
    skyBase: "#1B2200",
    skyMid: "#2A2000",
  },
  {
    peakName: "Aneto",
    altitude: "3.404 m",
    country: "🇪🇸 España",
    rarity: "Edelweiss",
    rarityEmoji: "🌸",
    color: "#3B82F6",
    ep: "+20",
    date: "14 ago 2024",
    route: "Vía del Portillón",
    skyBase: "#0A1628",
    skyMid: "#0F2460",
  },
  {
    peakName: "Picu Urriellu",
    altitude: "2.519 m",
    country: "🇪🇸 España",
    rarity: "Gentian",
    rarityEmoji: "🪻",
    color: "#A855F7",
    ep: "+16",
    date: "3 sep 2024",
    route: "Vía normal SW",
    skyBase: "#130A20",
    skyMid: "#1A0B30",
  },
];

function MountainScene({ uid, color, skyBase, skyMid }: { uid: string; color: string; skyBase: string; skyMid: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 260 325" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="260" height="325" fill={skyBase} />
      <rect width="260" height="325" fill={`url(#sg-${uid})`} />
      <circle cx="40" cy="30" r="1" fill="white" opacity="0.5"/>
      <circle cx="90" cy="15" r="0.8" fill="white" opacity="0.4"/>
      <circle cx="190" cy="22" r="1" fill="white" opacity="0.6"/>
      <circle cx="220" cy="40" r="0.7" fill="white" opacity="0.4"/>
      <circle cx="130" cy="10" r="1.2" fill="white" opacity="0.45"/>
      <path d="M0 200 L40 140 L80 170 L120 120 L160 155 L200 130 L240 160 L260 145 L260 325 L0 325Z" fill="#0d1e35" opacity="0.6"/>
      <path d="M0 240 L30 180 L60 210 L100 160 L140 200 L180 170 L220 195 L260 175 L260 325 L0 325Z" fill={skyBase} opacity="0.9"/>
      <path d="M-20 325 L130 58 L280 325Z" fill="#13263d"/>
      <path d="M130 58 L95 128 L130 113 L165 128Z" fill="rgba(255,255,255,0.92)"/>
      <path d="M130 58 L95 128 L130 113Z" fill="rgba(255,255,255,0.55)"/>
      <path d="M120 113 L110 142" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M142 116 L152 145" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
      <ellipse cx="130" cy="88" rx="55" ry="36" fill={`url(#pg-${uid})`} opacity="0.5"/>
      <defs>
        <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyBase}/>
          <stop offset="55%" stopColor={skyMid} stopOpacity="0.7"/>
          <stop offset="100%" stopColor={skyBase} stopOpacity="0"/>
        </linearGradient>
        <radialGradient id={`pg-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

function SingleCard({ card }: { card: typeof DECK[0] }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 28,
        border: "1px solid rgba(13,37,56,0.07)",
        boxShadow: "0 1px 3px rgba(13,37,56,0.10), 0 20px 50px rgba(13,37,56,0.14)",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      {/* Image frame */}
      <div
        style={{
          borderRadius: 18,
          overflow: "hidden",
          position: "relative",
          aspectRatio: "4/5",
          background: card.skyBase,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
        }}
      >
        <MountainScene uid={card.peakName} color={card.color} skyBase={card.skyBase} skyMid={card.skyMid} />

        <div style={{ position: "absolute", inset: 0, height: "52%", bottom: 0, top: "auto", background: "linear-gradient(to top, rgba(7,18,31,0.90) 0%, rgba(7,18,31,0.45) 55%, transparent 100%)", pointerEvents: "none" }} />

        {/* Rarity badge */}
        <div style={{ position: "absolute", top: 12, left: 12, background: `${card.color}EC`, color: "#fff", fontSize: 9, fontWeight: 900, letterSpacing: "0.12em", padding: "5px 10px", borderRadius: 999, boxShadow: `0 8px 24px ${card.color}55`, fontFamily: "var(--font-space, sans-serif)", textTransform: "uppercase" }}>
          {card.rarityEmoji} {card.rarity}
        </div>

        {/* Peak info */}
        <div style={{ position: "absolute", bottom: 14, left: 14, right: 14, pointerEvents: "none" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.035em", lineHeight: 1.05, textShadow: "0 2px 8px rgba(0,0,0,0.45)", marginBottom: 3 }}>
            {card.peakName}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.86)", textShadow: "0 1px 4px rgba(0,0,0,0.45)", marginBottom: 4 }}>
            {card.route}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.72)", textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}>{card.date}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.72)", textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}>{card.country}</span>
          </div>
        </div>
      </div>

      {/* Stat band */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8 }}>
        {[
          { label: "Altitud", value: card.altitude, color: card.color },
          { label: "Rareza", value: `${card.rarityEmoji} ${card.rarity}`, color: card.color },
          { label: "EP", value: card.ep, color: "#FF5D2D" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#F8FAFC", borderRadius: 12, padding: "9px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase", color: "#8A94A3", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardDeck() {
  const [active, setActive] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [noTransition, setNoTransition] = useState<number | null>(null);
  // "fan" = intro spread, "gather" = collapsing to stack, "ready" = normal cycling
  const [phase, setPhase] = useState<"fan" | "gather" | "ready">("fan");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intro animation: fan out → gather → start cycling
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("gather"), 650);
    const t2 = setTimeout(() => setPhase("ready"), 1250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const cycle = useCallback(() => {
    if (transitioning || phase !== "ready") return;
    setTransitioning(true);
    const prev = active;
    setTimeout(() => {
      setNoTransition(prev);
      setActive(a => (a + 1) % DECK.length);
      setTransitioning(false);
      setTimeout(() => setNoTransition(null), 60);
    }, 460);
  }, [active, transitioning, phase]);

  useEffect(() => {
    if (phase !== "ready") return;
    timerRef.current = setTimeout(cycle, 3600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [cycle, phase]);

  // position 0 = front, 1 = mid, 2 = back
  const stackStyles = [
    { transform: "translateX(0px) translateY(0px) rotate(0deg) scale(1)", zIndex: 10, opacity: 1 },
    { transform: "translateX(22px) translateY(10px) rotate(6deg) scale(0.95)", zIndex: 9, opacity: 0.88 },
    { transform: "translateX(40px) translateY(18px) rotate(11deg) scale(0.90)", zIndex: 8, opacity: 0.72 },
  ];
  // Fanned positions: cards spread wide so all 3 are clearly visible
  const fanStyles = [
    { transform: "translateX(-52px) translateY(8px) rotate(-14deg) scale(0.92)", zIndex: 8, opacity: 0.85 },
    { transform: "translateX(0px) translateY(-8px) rotate(0deg) scale(0.96)", zIndex: 10, opacity: 1 },
    { transform: "translateX(52px) translateY(8px) rotate(14deg) scale(0.92)", zIndex: 9, opacity: 0.85 },
  ];
  const exitStyle = { transform: "translateX(-130%) translateY(-20px) rotate(-20deg) scale(0.82)", zIndex: 20, opacity: 0 };

  const getStyle = (i: number) => {
    const pos = (i - active + DECK.length) % DECK.length;
    if (transitioning && pos === 0) return exitStyle;
    if (phase === "fan") return fanStyles[pos];
    return stackStyles[pos];
  };

  return (
    <div style={{ position: "relative", width: 270, cursor: "pointer" }} onClick={cycle}>
      {/* Reserve space for the front card */}
      <div style={{ visibility: "hidden", pointerEvents: "none" }}>
        <SingleCard card={DECK[0]} />
      </div>

      {DECK.map((card, i) => {
        const style = getStyle(i);
        const isInstant = noTransition === i;
        const isFanning = phase === "fan";

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              ...style,
              transition: isInstant
                ? "none"
                : isFanning
                  ? "none"
                  : "transform 0.52s cubic-bezier(0.2,0.8,0.2,1), opacity 0.42s ease",
              transformOrigin: "bottom center",
              willChange: "transform, opacity",
            }}
          >
            <SingleCard card={card} />
          </div>
        );
      })}

      <p style={{ textAlign: "center", fontSize: 11, color: "rgba(13,37,56,0.35)", marginTop: 10, opacity: phase === "ready" ? 1 : 0, transition: "opacity 0.4s ease" }}>
        Toca para pasar la carta
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
            <CardDeck />
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
