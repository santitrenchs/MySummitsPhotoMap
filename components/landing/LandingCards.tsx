"use client";

import { useEffect, useRef, useState } from "react";

type CardData = {
  peakName: string;
  altitude: string;
  country: string;
  rarity: string;
  rarityEmoji: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  ep: string;
  date: string;
  route: string;
  mountainRange: string;
};

const CARDS: CardData[] = [
  {
    peakName: "Aneto",
    altitude: "3.404 m",
    country: "🇪🇸 España",
    rarity: "Edelweiss",
    rarityEmoji: "🌸",
    color: "#3B82F6",
    gradientFrom: "#0F2460",
    gradientTo: "#070B14",
    ep: "20 EP",
    date: "14 ago 2024",
    route: "Vía del Portillón de Benasque",
    mountainRange: "Pirineos",
  },
  {
    peakName: "Mont Blanc",
    altitude: "4.808 m",
    country: "🇫🇷 Francia",
    rarity: "Snow Lotus",
    rarityEmoji: "❄️",
    color: "#FFD700",
    gradientFrom: "#2A2000",
    gradientTo: "#070B14",
    ep: "1.000 EP",
    date: "22 jul 2023",
    route: "Vía normal por Goûter",
    mountainRange: "Alpes",
  },
  {
    peakName: "Picu Urriellu",
    altitude: "2.519 m",
    country: "🇪🇸 España",
    rarity: "Gentian",
    rarityEmoji: "🪻",
    color: "#A855F7",
    gradientFrom: "#1A0B30",
    gradientTo: "#070B14",
    ep: "16 EP",
    date: "3 sep 2024",
    route: "Vía normal SW desde Collado Jermoso",
    mountainRange: "Picos de Europa",
  },
];

function MountainSVG({ color }: { color: string }) {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M70 85 L95 30 L120 85Z"
        fill={`${color}0D`}
        stroke={`${color}22`}
        strokeWidth="1"
      />
      <path
        d="M0 90 L60 5 L120 90Z"
        fill="none"
        stroke={`${color}55`}
        strokeWidth="1.5"
      />
      <path
        d="M60 5 L45 34 L60 29 L75 34Z"
        fill={`${color === "#FFD700" ? "rgba(255,255,255,0.95)" : `${color}CC`}`}
        stroke={`${color}80`}
        strokeWidth="0.5"
      />
      <path d="M60 5 L45 34 L60 29Z" fill="rgba(255,255,255,0.5)" />
      <ellipse cx="60" cy="55" rx="35" ry="6" fill={`${color}08`} />
    </svg>
  );
}

function FlipCard({ card, index }: { card: CardData; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const isDesktop = useRef(false);

  useEffect(() => {
    isDesktop.current = window.matchMedia("(hover: hover)").matches;
  }, []);

  const handleClick = () => {
    if (!isDesktop.current) setFlipped((f) => !f);
  };

  return (
    <div
      style={{
        perspective: 1200,
        width: 220,
        height: 320,
        flexShrink: 0,
        cursor: "pointer",
      }}
      className="flip-card-wrapper"
      onMouseEnter={() => { if (isDesktop.current) setFlipped(true); }}
      onMouseLeave={() => { if (isDesktop.current) setFlipped(false); }}
      onClick={handleClick}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: 16,
            background: `linear-gradient(155deg, ${card.gradientFrom} 0%, ${card.gradientTo} 100%)`,
            border: `1px solid ${card.color}40`,
            boxShadow: `0 0 40px ${card.color}18, inset 0 1px 0 rgba(255,255,255,0.08)`,
            display: "flex",
            flexDirection: "column",
            padding: "16px 16px 18px",
            overflow: "hidden",
          }}
        >
          {/* Top glow */}
          <div
            style={{
              position: "absolute",
              top: -20,
              left: "50%",
              transform: "translateX(-50%)",
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${card.color}20 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />

          {/* Rarity badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span
              style={{
                background: `${card.color}18`,
                border: `1px solid ${card.color}40`,
                borderRadius: 100,
                padding: "3px 9px",
                fontSize: 9,
                fontWeight: 700,
                color: card.color,
                fontFamily: "var(--font-space, sans-serif)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {card.rarityEmoji} {card.rarity}
            </span>
            <span style={{ fontSize: 9, color: "rgba(240,244,255,0.35)", fontFamily: "var(--font-mono-landing, monospace)" }}>
              #{(index + 1).toString().padStart(4, "0")}
            </span>
          </div>

          {/* Mountain graphic */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${card.color}10 0%, transparent 70%)`,
              }}
            />
            <MountainSVG color={card.color} />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: `${card.color}20`, margin: "10px 0" }} />

          {/* Peak info */}
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "var(--font-space, sans-serif)",
                color: "#F0F4FF",
                letterSpacing: "-0.02em",
                marginBottom: 2,
              }}
            >
              {card.peakName}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <span
                className="ld-mono"
                style={{ fontSize: 18, fontWeight: 500, color: card.color }}
              >
                {card.altitude}
              </span>
              <span style={{ fontSize: 10, color: "rgba(240,244,255,0.4)" }}>{card.country}</span>
            </div>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono-landing, monospace)",
                  color: card.color,
                  background: `${card.color}15`,
                  borderRadius: 4,
                  padding: "2px 5px",
                }}
              >
                {card.ep}
              </span>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 16,
            background: "var(--ld-bg-elevated)",
            border: `1px solid ${card.color}35`,
            boxShadow: `0 0 40px ${card.color}12`,
            display: "flex",
            flexDirection: "column",
            padding: "18px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontFamily: "var(--font-space, sans-serif)", fontWeight: 700, color: "#F0F4FF" }}>
              {card.peakName}
            </span>
            <span
              style={{
                background: `${card.color}18`,
                border: `1px solid ${card.color}40`,
                borderRadius: 100,
                padding: "2px 7px",
                fontSize: 9,
                color: card.color,
                fontWeight: 700,
              }}
            >
              {card.rarityEmoji}
            </span>
          </div>

          {/* Stats */}
          {[
            { label: "Altitud", value: card.altitude },
            { label: "Rareza", value: card.rarity },
            { label: "Cordillera", value: card.mountainRange },
            { label: "País", value: card.country },
            { label: "Fecha", value: card.date },
            { label: "Ruta", value: card.route },
            { label: "EP ganados", value: card.ep },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "7px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 10, color: "rgba(240,244,255,0.4)", fontWeight: 500, flexShrink: 0 }}>
                {stat.label}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: stat.label === "EP ganados" ? card.color : "rgba(240,244,255,0.8)",
                  fontFamily: stat.label === "Altitud" || stat.label === "EP ganados" ? "var(--font-mono-landing, monospace)" : "inherit",
                  textAlign: "right",
                }}
              >
                {stat.value}
              </span>
            </div>
          ))}

          <div
            style={{
              marginTop: "auto",
              paddingTop: 12,
              textAlign: "center",
              fontSize: 10,
              color: "rgba(240,244,255,0.3)",
            }}
          >
            ✓ Capturada · Peakadex
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingCards() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const items = section.querySelectorAll<HTMLElement>(".flip-card-wrapper");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const i = Array.from(items).indexOf(el);
            setTimeout(() => {
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
            }, i * 150);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(30px)";
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="cartas"
      className="ld-section"
      ref={sectionRef}
      style={{
        background: "linear-gradient(180deg, #070B14 0%, #0C1220 100%)",
      }}
    >
      <div className="ld-container">
        {/* Header */}
        <div style={{ marginBottom: 56 }} className="ld-cards-header">
          <div className="ld-section-label">Cartas coleccionables</div>
          <h2 className="ld-display ld-section-title">
            Cada cima, una carta.
            <br />
            <span style={{ color: "var(--ld-gold)" }}>Tu colección, tu leyenda.</span>
          </h2>
          <p className="ld-section-sub">
            Cuando registras una ascensión, Peakadex genera una carta única
            de esa montaña. Anverso y reverso. Como un trofeo, pero que
            cabe en el bolsillo.
          </p>
          <p style={{ fontSize: 13, color: "rgba(240,244,255,0.35)", marginTop: 12 }}>
            Pasa el cursor (o toca) para ver el reverso →
          </p>
        </div>

        {/* Cards */}
        <div
          style={{
            display: "flex",
            gap: 24,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {CARDS.map((card, i) => (
            <FlipCard key={card.peakName} card={card} index={i} />
          ))}
        </div>

        {/* Bottom copy */}
        <div style={{ textAlign: "center", marginTop: 52 }}>
          <p
            style={{
              fontSize: 15,
              color: "rgba(240,244,255,0.45)",
              marginBottom: 6,
              fontStyle: "italic",
            }}
          >
            &ldquo;Algunas cartas son comunes. Otras son casi imposibles.&rdquo;
          </p>
          <p style={{ fontSize: 13, color: "rgba(240,244,255,0.3)", marginBottom: 28 }}>
            Las Snow Lotus se cuentan con los dedos de las manos.
          </p>
          <a href="/register" className="ld-btn-primary" style={{ display: "inline-flex" }}>
            Empieza tu colección
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 560px) {
          .ld-cards-header h2 { font-size: 30px !important; }
        }
      `}</style>
    </section>
  );
}
