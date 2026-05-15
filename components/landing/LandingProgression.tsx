"use client";

import { useEffect, useRef, useState } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CORDADA = [
  { pos: 1, name: "Santi",           initials: "SM", color: "#0EA5E9", level: "Scout", cimas: 26, cairns: 2, ep: 93,  isMe: true  },
  { pos: 2, name: "Clara de Miguel", initials: "CM", color: "#9A8FAE", level: "Scout", cimas: 2,  cairns: 0, ep: 8,   isMe: false },
  { pos: 3, name: "Test Mailinator", initials: "TM", color: "#5A7A8E", level: "Scout", cimas: 2,  cairns: 0, ep: 6,   isMe: false },
] as const;

const ZENITH_LEVELS = [
  { label: "ZENITH",   desc: "Muy pocos llegan aquí.",     isTop: true,  isUser: false },
  { label: "LEGEND",   desc: "Para montañeros de élite.",  isTop: false, isUser: false },
  { label: "MASTER",   desc: "Dominio y experiencia.",     isTop: false, isUser: false },
  { label: "EXPLORER", desc: "Buscando nuevos límites.",   isTop: false, isUser: false },
  { label: "GUIDE",    desc: "Conocimiento y constancia.", isTop: false, isUser: false },
  { label: "SCOUT",    desc: "Tu camino comienza aquí.",   isTop: false, isUser: true  },
] as const;

const POS_COLOR: Record<number, string> = { 1: "#0EA5E9", 2: "#F97316", 3: "#F97316" };

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconGroup() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.4)" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3"/>
      <path d="M3 20v-1a6 6 0 0112 0v1"/>
      <circle cx="17" cy="7" r="2.5" strokeOpacity="0.5"/>
      <path d="M21 20v-1a5.5 5.5 0 00-4-5.3" strokeOpacity="0.5"/>
    </svg>
  );
}

function IconMountain() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="rgba(245,200,66,0.7)" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18L13 4 9 12l-3-3L3 20z"/>
    </svg>
  );
}

// ─── Mountain SVG background (Card 2) ────────────────────────────────────────

function MountainBg() {
  const stars: [number, number, number][] = [
    [22,14,0.75],[52,7,0.6],[88,20,0.7],[118,10,0.5],[150,5,0.8],[185,17,0.6],
    [218,9,0.7],[252,4,0.5],[288,14,0.65],[325,7,0.75],[358,19,0.5],[395,11,0.7],
    [425,5,0.6],[452,15,0.5],[482,8,0.8],[512,21,0.6],[538,13,0.65],
    [38,33,0.35],[98,38,0.4],[172,30,0.35],[255,36,0.4],[335,28,0.35],[430,33,0.4],
  ];

  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      viewBox="0 0 560 460"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mbSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#01050D"/>
          <stop offset="100%" stopColor="#050C1A"/>
        </linearGradient>
        <radialGradient id="mbGlow" cx="400" cy="48" r="210" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="rgba(238,182,52,0.52)"/>
          <stop offset="30%" stopColor="rgba(238,182,52,0.14)"/>
          <stop offset="100%" stopColor="rgba(238,182,52,0)"/>
        </radialGradient>
        <radialGradient id="mbGlow2" cx="400" cy="48" r="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="rgba(255,220,100,0.35)"/>
          <stop offset="100%" stopColor="rgba(255,220,100,0)"/>
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect width="560" height="460" fill="url(#mbSky)"/>

      {/* Stars */}
      {stars.map(([x, y, op], i) => (
        <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 1.1 : 0.65}
          fill={`rgba(255,255,255,${op})`}/>
      ))}

      {/* Far ridge */}
      <path
        d="M0,460 L0,325 L75,305 L155,315 L235,285 L315,272 L395,248 L455,260 L560,230 L560,460 Z"
        fill="#071526" opacity="0.9"
      />

      {/* Main mountain — peak at (400, 48) */}
      <path
        d="M0,460 L0,375 L65,360 L125,368 L175,345 L210,352 L250,325 L282,330 L314,298 L338,288 L360,248 L376,200 L390,148 L396,88 L399,48 L402,88 L410,148 L428,188 L452,200 L478,212 L510,218 L542,210 L560,202 L560,460 Z"
        fill="#060C1C"
      />

      {/* Snow */}
      <path d="M393,72 L399,48 L405,72 L402,86 L396,86 Z" fill="rgba(215,232,255,0.68)"/>
      <path d="M396,52 L399,48 L402,52 L401,60 L398,60 Z" fill="rgba(238,248,255,0.82)"/>
      <path d="M388,90 L393,82 L397,90 L395,96 L390,96 Z" fill="rgba(215,232,255,0.35)"/>
      <path d="M405,85 L409,78 L412,85 L411,90 L407,90 Z" fill="rgba(215,232,255,0.3)"/>

      {/* Wide ambient glow */}
      <ellipse cx="400" cy="48" rx="210" ry="160" fill="url(#mbGlow)"/>
      {/* Inner tight glow */}
      <ellipse cx="400" cy="48" rx="90"  ry="70"  fill="url(#mbGlow2)"/>

      {/* Trail — winding dashed path up the right flank */}
      <path
        d="M408,460 L404,422 L416,394 L406,364 L418,336 L406,308 L418,278 L408,250 L416,222 L408,194 L416,162 L408,128 L412,92 L399,48"
        fill="none"
        stroke="rgba(242,188,52,0.2)"
        strokeWidth="1.6"
        strokeDasharray="5,4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Hover helper ─────────────────────────────────────────────────────────────

function useHover() {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    bind: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
  };
}

// ─── Card 1 — Tu cordada ──────────────────────────────────────────────────────

function CardCordada({ revealed }: { revealed: boolean }) {
  const { hovered, bind } = useHover();

  return (
    <div
      {...bind}
      style={{
        flex: "1 1 0", minWidth: 0,
        borderRadius: 22,
        background: "linear-gradient(158deg, #0E1E2C 0%, #0A1825 60%, #071220 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: hovered
          ? "0 40px 100px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.09)"
          : "0 28px 72px rgba(0,0,0,0.22)",
        padding: "28px 24px 24px",
        display: "flex", flexDirection: "column" as const,
        opacity: revealed ? 1 : 0,
        transform: revealed ? (hovered ? "translateY(-4px)" : "translateY(0)") : "translateY(32px)",
        transition: revealed
          ? "opacity 0.75s ease 0.08s, transform 0.5s ease, box-shadow 0.4s ease"
          : "opacity 0.75s ease 0.08s, transform 0.75s ease 0.08s",
        position: "relative" as const,
        overflow: "hidden",
        cursor: "default",
      }}
    >
      {/* Top edge shimmer */}
      <div style={{
        position: "absolute", top: 0, left: "12%", right: "12%", height: 1,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
        pointerEvents: "none",
      }}/>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
        <IconGroup/>
        <span style={{
          fontSize: 17, fontWeight: 700, color: "#FFF",
          letterSpacing: "-0.02em",
          fontFamily: "var(--font-space, sans-serif)",
        }}>
          Tu cordada
        </span>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
        Compite con quienes comparten tu camino.
      </p>

      {/* Column headers */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "0 8px 9px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 4,
      }}>
        {(["POS.", "MONTAÑERO", "CIMAS", "CAIRNS", "EP"] as const).map((col, i) => (
          <span
            key={col}
            style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.13em",
              textTransform: "uppercase" as const,
              color: "rgba(255,255,255,0.22)",
              ...(i === 0 ? { width: 28, flexShrink: 0 }
                : i === 1 ? { flex: 1 }
                : { width: i === 2 ? 48 : i === 3 ? 54 : 42, textAlign: "right" as const, flexShrink: 0 }),
            }}
          >
            {col}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 3, flex: 1 }}>
        {CORDADA.map((r) => (
          <div
            key={r.name}
            style={{
              display: "flex", alignItems: "center",
              padding: r.isMe ? "10px 8px" : "7px 8px",
              borderRadius: 14,
              background: r.isMe ? "rgba(14,165,233,0.09)" : "transparent",
              border: r.isMe ? "1px solid rgba(14,165,233,0.16)" : "1px solid transparent",
            }}
          >
            {/* Position */}
            <span style={{
              width: 28, flexShrink: 0,
              fontSize: 13, fontWeight: 700,
              color: POS_COLOR[r.pos] ?? "rgba(255,255,255,0.28)",
              fontFamily: "var(--font-mono-landing, monospace)",
            }}>
              {r.pos}
            </span>

            {/* Avatar + name */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: r.isMe ? "linear-gradient(135deg,#0EA5E9,#0369A1)" : `${r.color}1A`,
                border: r.isMe ? "1.5px solid rgba(14,165,233,0.45)" : `1.5px solid ${r.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, letterSpacing: "0.02em",
                color: r.isMe ? "#fff" : r.color,
              }}>
                {r.initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: 13, fontWeight: r.isMe ? 700 : 500,
                    color: r.isMe ? "#FFF" : "rgba(255,255,255,0.6)",
                    letterSpacing: "-0.01em",
                    overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const,
                  }}>
                    {r.name}
                  </span>
                  {r.isMe && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: "#0EA5E9",
                      background: "rgba(14,165,233,0.13)",
                      border: "1px solid rgba(14,165,233,0.28)",
                      borderRadius: 100, padding: "1px 6px",
                      letterSpacing: "0.04em", flexShrink: 0,
                    }}>tú</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 1 }}>
                  {r.level}
                </div>
              </div>
            </div>

            {/* Cimas */}
            <span style={{
              width: 48, textAlign: "right" as const, flexShrink: 0,
              fontSize: 13, fontWeight: r.isMe ? 600 : 400,
              color: r.isMe ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.32)",
              fontFamily: "var(--font-mono-landing, monospace)",
            }}>
              {r.cimas}
            </span>

            {/* Cairns */}
            <span style={{
              width: 54, textAlign: "right" as const, flexShrink: 0,
              fontSize: 13, fontWeight: r.cairns > 0 ? 600 : 400,
              color: r.cairns > 0 ? "#F97316" : "rgba(255,255,255,0.2)",
              fontFamily: "var(--font-mono-landing, monospace)",
            }}>
              {r.cairns}
            </span>

            {/* EP */}
            <span style={{
              width: 42, textAlign: "right" as const, flexShrink: 0,
              fontSize: 13, fontWeight: 700,
              color: r.ep > 0 ? "#0EA5E9" : "rgba(255,255,255,0.2)",
              fontFamily: "var(--font-mono-landing, monospace)",
            }}>
              {r.ep}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 16, paddingTop: 16,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", gap: 9,
      }}>
        <IconGroup/>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
          La montaña se disfruta más en buena compañía.
        </span>
      </div>
    </div>
  );
}

// ─── Card 2 — Camino a Zenith ─────────────────────────────────────────────────

function CardZenith({ revealed }: { revealed: boolean }) {
  const { hovered, bind } = useHover();

  return (
    <div
      {...bind}
      style={{
        flex: "1 1 0", minWidth: 0,
        borderRadius: 22,
        background: "#060C1C",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: hovered
          ? "0 44px 110px rgba(0,0,0,0.34), 0 0 48px rgba(245,200,66,0.08), 0 0 0 1px rgba(255,255,255,0.09)"
          : "0 28px 72px rgba(0,0,0,0.26)",
        display: "flex", flexDirection: "column" as const,
        opacity: revealed ? 1 : 0,
        transform: revealed ? (hovered ? "translateY(-4px)" : "translateY(0)") : "translateY(32px)",
        transition: revealed
          ? "opacity 0.75s ease 0.2s, transform 0.5s ease, box-shadow 0.4s ease"
          : "opacity 0.75s ease 0.2s, transform 0.75s ease 0.2s",
        position: "relative" as const,
        overflow: "hidden",
        cursor: "default",
        minHeight: 420,
      }}
    >
      {/* Mountain background */}
      <MountainBg/>

      {/* Gradient: dark left → transparent right */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(to right, rgba(6,12,28,0.97) 0%, rgba(6,12,28,0.88) 45%, rgba(6,12,28,0.52) 72%, rgba(6,12,28,0.2) 100%)",
      }}/>
      {/* Bottom safety gradient */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 90, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(to top, rgba(6,12,28,0.85), transparent)",
      }}/>

      {/* Content — left 62% of card */}
      <div style={{
        position: "relative" as const, zIndex: 2,
        flex: 1, display: "flex", flexDirection: "column" as const,
        padding: "28px 0 24px 24px",
        width: "62%",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
          <IconMountain/>
          <span style={{
            fontSize: 17, fontWeight: 700, color: "#FFF",
            letterSpacing: "-0.02em",
            fontFamily: "var(--font-space, sans-serif)",
          }}>
            Camino a Zenith
          </span>
        </div>
        <p style={{ margin: "0 0 22px", fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
          La evolución no se mide solo en metros.
        </p>

        {/* Progression list */}
        <div style={{
          flex: 1,
          position: "relative" as const,
          display: "flex", flexDirection: "column" as const,
          justifyContent: "space-between",
          paddingLeft: 22,
        }}>
          {/* Track line */}
          <div style={{
            position: "absolute" as const,
            left: 4, top: 5, bottom: 5, width: 2,
            background: "linear-gradient(to bottom, rgba(245,200,66,0.45), rgba(14,165,233,0.35))",
            borderRadius: 1,
          }}/>

          {ZENITH_LEVELS.map((lv) => {
            const dotSize = lv.isTop || lv.isUser ? 9 : 6;
            const dotBg = lv.isTop
              ? "radial-gradient(circle at 40% 35%, #F5C842, #C4862B)"
              : lv.isUser ? "#38BDF8" : "rgba(255,255,255,0.14)";

            return (
              <div key={lv.label} style={{ position: "relative" as const }}>
                {/* Dot on track */}
                <div style={{
                  position: "absolute" as const,
                  left: -22 + 4 + 1 - dotSize / 2,  // centers on track (left:4, width:2, center=5)
                  top: 4,
                  width: dotSize, height: dotSize,
                  borderRadius: "50%",
                  background: dotBg,
                  animation: lv.isTop
                    ? "zpZenithPulse 3.2s ease-in-out infinite"
                    : lv.isUser
                      ? "zpUserPulse 2.4s ease-in-out infinite"
                      : "none",
                  zIndex: 1,
                }}/>
                {/* Label + desc */}
                <div style={{
                  fontSize: lv.isTop || lv.isUser ? 11 : 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: lv.isTop ? "#F5C842" : lv.isUser ? "#38BDF8" : "rgba(255,255,255,0.48)",
                  filter: lv.isTop
                    ? "drop-shadow(0 0 6px rgba(245,200,66,0.5))"
                    : lv.isUser
                      ? "drop-shadow(0 0 5px rgba(56,189,248,0.45))"
                      : "none",
                  marginBottom: 2,
                }}>
                  {lv.label}
                </div>
                <div style={{
                  fontSize: 11,
                  color: lv.isTop || lv.isUser ? "rgba(255,255,255,0.44)" : "rgba(255,255,255,0.26)",
                  lineHeight: 1.4,
                }}>
                  {lv.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
        @keyframes zpZenithPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(245,200,66,0.5), 0 0 18px rgba(245,200,66,0.22); }
          50%       { box-shadow: 0 0 14px rgba(245,200,66,0.85), 0 0 30px rgba(245,200,66,0.42); }
        }
        @keyframes zpUserPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(56,189,248,0.18), 0 0 12px rgba(56,189,248,0.5); }
          50%       { box-shadow: 0 0 0 5px rgba(56,189,248,0.09), 0 0 20px rgba(56,189,248,0.76); }
        }
        @media (max-width: 767px) {
          .soc-cards { flex-direction: column !important; }
          .soc-cards > * { min-height: 360px; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="zpZenithPulse"], [style*="zpUserPulse"] { animation: none !important; }
        }
      `}</style>

      <section
        ref={sectionRef}
        style={{ background: "#F6F4F0", padding: "100px 0 120px", position: "relative" as const }}
      >
        <div style={{
          position: "absolute" as const, inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle at 70% 28%, rgba(47,122,95,0.04) 0%, transparent 52%), radial-gradient(circle at 18% 78%, rgba(13,37,56,0.03) 0%, transparent 48%)",
        }}/>

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

          {/* 2 large cards */}
          <div className="soc-cards" style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
            <CardCordada revealed={revealed}/>
            <CardZenith  revealed={revealed}/>
          </div>
        </div>
      </section>
    </>
  );
}
