"use client";

import { useEffect, useRef, useState } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const RANKING = [
  { pos: 1, name: "Oriol",  initials: "OC", ascents: 48, isMe: false },
  { pos: 2, name: "Tú",     initials: "TÚ", ascents: 38, isMe: true  },
  { pos: 3, name: "Marta",  initials: "MR", ascents: 31, isMe: false },
] as const;

// Only Scout, Zenith, and intermediate ghost dots — no clutter
const ZENITH_ALL_PCTS = [100, 80, 60, 40, 20, 0] as const;
const USER_PCT = 32; // between Guide (20%) and Explorer (40%)

// ─── Premium dark card shell ──────────────────────────────────────────────────

function Card({
  children,
  delay,
  revealed,
  glowColor,
}: {
  children: React.ReactNode;
  delay: number;
  revealed: boolean;
  glowColor?: string; // e.g. "rgba(14,165,233,0.15)"
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 0",
        minWidth: 0,
        borderRadius: 22,
        background: "linear-gradient(160deg, #0F2030 0%, #0B1B29 55%, #091623 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: hovered
          ? `0 44px 110px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.09)${glowColor ? `, 0 0 48px ${glowColor}` : ""}`
          : "0 28px 72px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.05)",
        padding: "28px 24px 24px",
        display: "flex",
        flexDirection: "column" as const,
        opacity: revealed ? 1 : 0,
        transform: revealed
          ? hovered ? "translateY(-5px)" : "translateY(0)"
          : "translateY(32px)",
        transition: revealed
          ? `opacity 0.75s ease ${delay}s, transform 0.5s ease, box-shadow 0.4s ease`
          : `opacity 0.75s ease ${delay}s, transform 0.75s ease ${delay}s`,
        position: "relative" as const,
        overflow: "hidden",
        cursor: "default",
        willChange: "transform",
      }}
    >
      {/* Top edge shimmer */}
      <div style={{
        position: "absolute", top: 0, left: "12%", right: "12%", height: 1,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)",
        pointerEvents: "none",
      }} />
      {/* Ambient glow blob */}
      {glowColor && (
        <div style={{
          position: "absolute", top: -50, right: -50,
          width: 200, height: 200, borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor}, transparent)`,
          opacity: hovered ? 0.18 : 0.09,
          transition: "opacity 0.5s ease",
          pointerEvents: "none",
          filter: "blur(28px)",
        }} />
      )}
      {children}
    </div>
  );
}

// ─── Card label (shared) ──────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: "0 0 20px", fontSize: 9, fontWeight: 700,
      letterSpacing: "0.18em", textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.26)",
    }}>
      {children}
    </p>
  );
}

// ─── Card 1 — Tu cordada ──────────────────────────────────────────────────────

function CardCordada({ revealed }: { revealed: boolean }) {
  return (
    <Card delay={0.08} revealed={revealed} glowColor="rgba(14,165,233,0.18)">
      <CardLabel>Tu cordada</CardLabel>

      <div style={{ display: "flex", flexDirection: "column" as const, gap: 3, flex: 1 }}>
        {RANKING.map((r) => (
          <div
            key={r.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 12px",
              borderRadius: 14,
              background: r.isMe
                ? "linear-gradient(90deg, rgba(14,165,233,0.11) 0%, rgba(14,165,233,0.05) 100%)"
                : "rgba(255,255,255,0.022)",
              border: r.isMe
                ? "1px solid rgba(14,165,233,0.18)"
                : "1px solid transparent",
            }}
          >
            <span style={{
              width: 14, flexShrink: 0, textAlign: "center" as const,
              fontSize: 10, fontWeight: 600,
              color: r.pos === 1 ? "rgba(245,200,66,0.72)" : "rgba(255,255,255,0.15)",
              fontFamily: "var(--font-mono-landing, monospace)",
            }}>
              {r.pos}
            </span>

            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: r.isMe
                ? "linear-gradient(135deg, #0EA5E9, #0369A1)"
                : "rgba(255,255,255,0.05)",
              border: r.isMe
                ? "1.5px solid rgba(14,165,233,0.42)"
                : "1.5px solid rgba(255,255,255,0.09)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: 800, letterSpacing: "0.02em",
              color: r.isMe ? "#fff" : "rgba(255,255,255,0.35)",
            }}>
              {r.initials}
            </div>

            <span style={{
              flex: 1, fontSize: 13,
              fontWeight: r.isMe ? 600 : 400,
              color: r.isMe ? "#FFFFFF" : "rgba(255,255,255,0.35)",
              letterSpacing: "-0.01em",
            }}>
              {r.name}
            </span>

            <span style={{
              fontSize: 12,
              fontWeight: r.isMe ? 600 : 400,
              color: r.isMe ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.18)",
              fontFamily: "var(--font-mono-landing, monospace)",
            }}>
              {r.ascents}
            </span>
            <span style={{ fontSize: 9, color: r.isMe ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)" }}>↑</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.34)", lineHeight: 1.65 }}>
          Compite con quienes<br />comparten tu camino.
        </p>
      </div>
    </Card>
  );
}

// ─── Card 2 — Tu próxima cima ─────────────────────────────────────────────────

function CardNextSummit({ revealed }: { revealed: boolean }) {
  return (
    <Card delay={0.2} revealed={revealed} glowColor="rgba(168,128,80,0.2)">
      <CardLabel>Tu próxima cima</CardLabel>

      {/* Mountain preview card */}
      <div style={{
        flex: 1,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative" as const,
        minHeight: 160,
      }}>
        {/* Mountain scene SVG */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
          viewBox="0 0 280 170"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="nsPeakSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#020A14" />
              <stop offset="100%" stopColor="#071826" />
            </linearGradient>
            <linearGradient id="nsPeakOverlay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="65%" stopColor="rgba(7,18,30,0.7)" />
              <stop offset="100%" stopColor="rgba(5,12,22,0.98)" />
            </linearGradient>
          </defs>

          {/* Sky */}
          <rect width="280" height="170" fill="url(#nsPeakSky)" />

          {/* Stars */}
          {([
            [22,14],[55,8],[88,19],[130,6],[162,15],[200,9],[238,17],[260,5],
            [40,30],[110,25],[175,28],[245,32],
          ] as [number,number][]).map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.8 : 0.5}
              fill="rgba(255,255,255,0.55)" />
          ))}

          {/* Far ridge */}
          <path
            d="M0,170 L0,105 L35,95 L65,100 L90,72 L115,80 L140,42 L160,58 L185,50 L210,65 L240,55 L265,70 L280,62 L280,170 Z"
            fill="#0A1E35" opacity="0.9"
          />
          {/* Near ridge */}
          <path
            d="M0,170 L0,128 L28,122 L55,130 L82,118 L105,125 L130,112 L158,122 L185,110 L210,120 L240,115 L265,125 L280,118 L280,170 Z"
            fill="#06111F"
          />
          {/* Snow on main peak */}
          <path
            d="M136,44 L140,42 L144,44 L142,52 L138,52 Z"
            fill="rgba(210,230,255,0.72)"
          />
          <path
            d="M182,52 L185,50 L188,52 L187,57 L183,57 Z"
            fill="rgba(210,230,255,0.5)"
          />

          {/* Gradient overlay for text legibility */}
          <rect width="280" height="170" fill="url(#nsPeakOverlay)" />
        </svg>

        {/* Rarity badge — top left */}
        <div style={{
          position: "absolute", top: 12, left: 12,
          display: "inline-flex", alignItems: "center", gap: 5,
          background: "rgba(168,85,247,0.18)",
          border: "1px solid rgba(168,85,247,0.35)",
          borderRadius: 100,
          padding: "4px 10px",
        }}>
          <span style={{ fontSize: 9, color: "#C084FC", fontWeight: 700, letterSpacing: "0.06em" }}>✿</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#C084FC", letterSpacing: "0.05em" }}>EDELWEISS</span>
        </div>

        {/* EP chip — top right */}
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "rgba(251,146,60,0.15)",
          border: "1px solid rgba(251,146,60,0.3)",
          borderRadius: 100,
          padding: "4px 9px",
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(251,146,60,0.9)", letterSpacing: "0.04em" }}>+120 EP</span>
        </div>

        {/* Peak info — bottom */}
        <div style={{ position: "absolute", bottom: 14, left: 14, right: 14 }}>
          <div style={{
            fontSize: 17, fontWeight: 700, color: "#FFFFFF",
            lineHeight: 1.2, marginBottom: 4,
            letterSpacing: "-0.02em",
            textShadow: "0 1px 8px rgba(0,0,0,0.6)",
          }}>
            Barre des Écrins
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.03em" }}>
            4.102 m · Alpes Dauphinois
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.34)", lineHeight: 1.65 }}>
          Siempre hay una cima esperando<br />cambiar tu historia.
        </p>
      </div>
    </Card>
  );
}

// ─── Card 3 — Camino a Zenith ─────────────────────────────────────────────────

function CardZenith({ revealed }: { revealed: boolean }) {
  const TRACK_L = 18;

  return (
    <Card delay={0.34} revealed={revealed} glowColor="rgba(245,200,66,0.16)">
      <CardLabel>Camino a Zenith</CardLabel>

      {/* Track */}
      <div style={{ flex: 1, position: "relative" as const, minHeight: 200 }}>
        {/* Background track */}
        <div style={{
          position: "absolute" as const,
          left: TRACK_L, top: 6, bottom: 6, width: 2,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 1,
        }} />

        {/* Progress fill */}
        <div style={{
          position: "absolute" as const,
          left: TRACK_L, bottom: 6, width: 2,
          height: `calc(${USER_PCT}% - 4px)`,
          background: "linear-gradient(to top, rgba(56,189,248,0.55), rgba(56,189,248,0.15))",
          borderRadius: 1,
        }} />

        {/* Nodes */}
        {ZENITH_ALL_PCTS.map((pct) => {
          const isZenith = pct === 100;
          const isScout  = pct === 0;
          const isPast   = pct <= USER_PCT;
          const showLabel = isZenith || isScout;
          const dotSize  = isZenith ? 10 : 5;

          return (
            <div
              key={pct}
              style={{
                position: "absolute" as const,
                bottom: `${pct}%`,
                left: 0, right: 0,
                display: "flex",
                alignItems: "center",
                transform: "translateY(50%)",
                zIndex: 1,
              }}
            >
              {/* Dot */}
              <div style={{
                width: dotSize, height: dotSize,
                borderRadius: "50%",
                flexShrink: 0,
                marginLeft: TRACK_L - dotSize / 2,
                marginRight: showLabel ? 12 : 0,
                background: isZenith
                  ? "radial-gradient(circle at 38% 32%, #F5C842, #C4862B)"
                  : isPast
                    ? "rgba(56,189,248,0.6)"
                    : "rgba(255,255,255,0.09)",
                animation: isZenith ? "zenithNodeGlow 3.5s ease-in-out infinite" : "none",
              }} />

              {/* Label — only Scout and Zenith */}
              {showLabel && (
                <span style={{
                  fontSize: isZenith ? 12 : 10,
                  fontWeight: isZenith ? 700 : 400,
                  letterSpacing: isZenith ? "0.07em" : "0.02em",
                  color: isZenith
                    ? "#F5C842"
                    : "rgba(255,255,255,0.22)",
                  filter: isZenith
                    ? "drop-shadow(0 0 8px rgba(245,200,66,0.55))"
                    : "none",
                }}>
                  {isZenith ? "Zenith" : "Scout"}
                </span>
              )}
            </div>
          );
        })}

        {/* User dot — pulsing */}
        <div style={{
          position: "absolute" as const,
          bottom: `${USER_PCT}%`,
          left: TRACK_L,
          transform: "translate(-50%, 50%)",
          zIndex: 3,
        }}>
          <div style={{
            width: 11, height: 11,
            borderRadius: "50%",
            background: "#38BDF8",
            animation: "userLocPulse 2.4s ease-in-out infinite",
          }} />
        </div>

        {/* "Tú" label beside user dot */}
        <div style={{
          position: "absolute" as const,
          bottom: `${USER_PCT}%`,
          left: TRACK_L + 14,
          transform: "translateY(50%)",
          zIndex: 3,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: "rgba(56,189,248,0.75)",
            letterSpacing: "0.04em",
          }}>
            Tú
          </span>
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.34)", lineHeight: 1.65 }}>
          La evolución no se mide<br />solo en metros.
        </p>
      </div>
    </Card>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function LandingProgression() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setRevealed(true); },
      { threshold: 0.08 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @keyframes zenithNodeGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(245,200,66,0.5), 0 0 22px rgba(245,200,66,0.25); }
          50%       { box-shadow: 0 0 18px rgba(245,200,66,0.85), 0 0 38px rgba(245,200,66,0.42); }
        }
        @keyframes userLocPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(56,189,248,0.18), 0 0 14px rgba(56,189,248,0.52); }
          50%       { box-shadow: 0 0 0 5px rgba(56,189,248,0.09), 0 0 22px rgba(56,189,248,0.78); }
        }
        @media (max-width: 767px) {
          .soc-cards { flex-direction: column !important; }
          .soc-cards > * { min-height: 300px; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="zenithNodeGlow"], [style*="userLocPulse"] { animation: none !important; }
        }
      `}</style>

      <section
        ref={sectionRef}
        style={{ background: "#F6F4F0", padding: "100px 0 120px", position: "relative" as const }}
      >
        <div style={{
          position: "absolute" as const, inset: 0,
          backgroundImage: "radial-gradient(circle at 72% 28%, rgba(47,122,95,0.04) 0%, transparent 52%), radial-gradient(circle at 18% 78%, rgba(13,37,56,0.03) 0%, transparent 48%)",
          pointerEvents: "none",
        }} />

        <div className="ld-container" style={{ position: "relative" as const }}>
          {/* Header */}
          <div style={{
            marginBottom: 64,
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(22px)",
            transition: "opacity 0.75s ease, transform 0.75s ease",
          }}>
            <p className="ld-section-label" style={{ margin: "0 0 16px" }}>
              Tu evolución
            </p>
            <h2 className="ld-display ld-section-title" style={{ margin: "0 0 16px" }}>
              La montaña también<br />se comparte.
            </h2>
            <p className="ld-section-sub">
              Cada cima deja huella en tu evolución como montañero.
            </p>
          </div>

          {/* Cards */}
          <div className="soc-cards" style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
            <CardCordada    revealed={revealed} />
            <CardNextSummit revealed={revealed} />
            <CardZenith     revealed={revealed} />
          </div>
        </div>
      </section>
    </>
  );
}
