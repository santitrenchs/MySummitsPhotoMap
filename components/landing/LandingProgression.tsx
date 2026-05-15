"use client";

import { useEffect, useRef, useState } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const RANKING = [
  { pos: 1, name: "Oriol",  initials: "OC", ascents: 48, isMe: false },
  { pos: 2, name: "Tú",     initials: "TÚ", ascents: 38, isMe: true  },
  { pos: 3, name: "Marta",  initials: "MR", ascents: 31, isMe: false },
] as const;

// Rendered top-to-bottom in UI (Zenith at top, Scout at bottom)
const ZENITH_NODES = [
  { label: "Zenith",   pct: 100 },
  { label: "Legend",   pct: 80  },
  { label: "Master",   pct: 60  },
  { label: "Explorer", pct: 40  },
  { label: "Guide",    pct: 20  },
  { label: "Scout",    pct: 0   },
] as const;

const USER_PCT = 32; // between Guide (20%) and Explorer (40%)

// ─── Premium dark card shell ──────────────────────────────────────────────────

function Card({
  children,
  delay,
  revealed,
  accentGlow,
}: {
  children: React.ReactNode;
  delay: number;
  revealed: boolean;
  accentGlow?: string;
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
        boxShadow: [
          hovered
            ? `0 40px 100px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.09)${accentGlow ? `, ${accentGlow}` : ""}`
            : "0 28px 72px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06)",
        ].join(""),
        padding: "30px 26px 26px",
        display: "flex",
        flexDirection: "column" as const,
        opacity: revealed ? 1 : 0,
        transform: revealed
          ? hovered ? "translateY(-4px)" : "translateY(0)"
          : "translateY(32px)",
        transition: revealed
          ? `opacity 0.75s ease ${delay}s, transform 0.75s ease ${delay}s, box-shadow 0.4s ease`
          : `opacity 0.75s ease ${delay}s, transform 0.75s ease ${delay}s`,
        position: "relative" as const,
        overflow: "hidden",
        cursor: "default",
        willChange: "transform",
      }}
    >
      {/* Top edge highlight */}
      <div style={{
        position: "absolute", top: 0, left: "15%", right: "15%", height: 1,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
        pointerEvents: "none",
      }} />
      {/* Ambient glow blob */}
      {accentGlow && (
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 180, height: 180, borderRadius: "50%",
          background: accentGlow.replace("0 0 40px", "radial-gradient(circle,").replace(")", ", transparent)"),
          opacity: hovered ? 0.12 : 0.07,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
          filter: "blur(32px)",
        }} />
      )}
      {children}
    </div>
  );
}

// ─── Card 1 — Tu cordada ──────────────────────────────────────────────────────

function CardCordada({ revealed }: { revealed: boolean }) {
  return (
    <Card delay={0.08} revealed={revealed} accentGlow="0 0 40px rgba(14,165,233,0.15)">
      {/* Label */}
      <p style={{
        margin: "0 0 22px", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase" as const,
        color: "rgba(255,255,255,0.28)",
      }}>
        Tu cordada
      </p>

      {/* Ranking rows */}
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
                : "rgba(255,255,255,0.025)",
              border: r.isMe
                ? "1px solid rgba(14,165,233,0.18)"
                : "1px solid transparent",
            }}
          >
            {/* Position */}
            <span style={{
              width: 14, flexShrink: 0, textAlign: "center" as const,
              fontSize: 10, fontWeight: 600,
              color: r.pos === 1
                ? "rgba(245,200,66,0.75)"
                : "rgba(255,255,255,0.16)",
              fontFamily: "var(--font-mono-landing, monospace)",
            }}>
              {r.pos}
            </span>

            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: r.isMe
                ? "linear-gradient(135deg, #0EA5E9, #0369A1)"
                : "rgba(255,255,255,0.06)",
              border: r.isMe
                ? "1.5px solid rgba(14,165,233,0.45)"
                : "1.5px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: 800, letterSpacing: "0.02em",
              color: r.isMe ? "#fff" : "rgba(255,255,255,0.4)",
            }}>
              {r.initials}
            </div>

            {/* Name */}
            <span style={{
              flex: 1, fontSize: 13,
              fontWeight: r.isMe ? 600 : 400,
              color: r.isMe ? "#FFFFFF" : "rgba(255,255,255,0.38)",
              letterSpacing: "-0.01em",
            }}>
              {r.name}
            </span>

            {/* Ascents */}
            <span style={{
              fontSize: 12,
              fontWeight: r.isMe ? 600 : 400,
              color: r.isMe
                ? "rgba(255,255,255,0.85)"
                : "rgba(255,255,255,0.2)",
              fontFamily: "var(--font-mono-landing, monospace)",
            }}>
              {r.ascents}
            </span>

            {/* Cimas micro-label */}
            <span style={{
              fontSize: 9,
              color: r.isMe ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)",
            }}>
              ↑
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 22, paddingTop: 18,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <p style={{
          margin: 0, fontSize: 13,
          color: "rgba(255,255,255,0.36)",
          lineHeight: 1.65, fontWeight: 400,
        }}>
          Compite con quienes<br />comparten tu camino.
        </p>
      </div>
    </Card>
  );
}

// ─── Card 2 — Cada cima cuenta ────────────────────────────────────────────────

function CardClimb({ revealed }: { revealed: boolean }) {
  return (
    <Card delay={0.2} revealed={revealed} accentGlow="0 0 40px rgba(47,122,95,0.18)">
      {/* Label */}
      <p style={{
        margin: "0 0 22px", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase" as const,
        color: "rgba(255,255,255,0.28)",
      }}>
        Cada cima cuenta
      </p>

      {/* Central animation area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: "4px 0 10px",
      }}>
        {/* +1 posición badge — CSS-animated loop */}
        <div className="soc-badge" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 22px", borderRadius: 100,
        }}>
          <span style={{ fontSize: 16, lineHeight: 1, fontWeight: 300 }}>↑</span>
          <span style={{
            fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em",
          }}>
            +1 posición
          </span>
        </div>

        {/* Before row */}
        <div style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px", borderRadius: 12,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}>
          <span style={{
            fontSize: 10, color: "rgba(255,255,255,0.2)",
            width: 14, textAlign: "center" as const,
            fontFamily: "var(--font-mono-landing, monospace)",
          }}>3</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", flex: 1 }}>Antes</span>
          <span style={{
            fontSize: 11, color: "rgba(255,255,255,0.16)",
            fontFamily: "var(--font-mono-landing, monospace)",
          }}>31</span>
        </div>

        {/* After row — animated highlight */}
        <div className="soc-after-row" style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 10,
          padding: "11px 12px", borderRadius: 12,
          border: "1px solid rgba(14,165,233,0.18)",
        }}>
          <span style={{
            fontSize: 10, color: "rgba(245,200,66,0.65)",
            width: 14, textAlign: "center" as const,
            fontFamily: "var(--font-mono-landing, monospace)",
          }}>2</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", flex: 1 }}>Tú</span>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: "rgba(255,255,255,0.8)",
            fontFamily: "var(--font-mono-landing, monospace)",
          }}>39</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 14, paddingTop: 18,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <p style={{
          margin: 0, fontSize: 13,
          color: "rgba(255,255,255,0.36)",
          lineHeight: 1.65, fontWeight: 400,
        }}>
          Cada ascensión puede<br />cambiar la clasificación.
        </p>
      </div>
    </Card>
  );
}

// ─── Card 3 — Camino a Zenith ─────────────────────────────────────────────────

function CardZenith({ revealed }: { revealed: boolean }) {
  const TRACK_L = 18; // px from left edge of content area

  return (
    <Card delay={0.34} revealed={revealed} accentGlow="0 0 40px rgba(245,200,66,0.15)">
      {/* Label */}
      <p style={{
        margin: "0 0 22px", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase" as const,
        color: "rgba(255,255,255,0.28)",
      }}>
        Camino a Zenith
      </p>

      {/* Progression track */}
      <div style={{ flex: 1, position: "relative" as const, minHeight: 210 }}>
        {/* Background track line */}
        <div style={{
          position: "absolute" as const,
          left: TRACK_L, top: 6, bottom: 6, width: 2,
          background: "rgba(255,255,255,0.07)",
          borderRadius: 1,
        }} />

        {/* Filled progress */}
        <div style={{
          position: "absolute" as const,
          left: TRACK_L, bottom: 6, width: 2,
          height: `calc(${USER_PCT}% - 6px)`,
          background: "linear-gradient(to top, rgba(14,165,233,0.65), rgba(14,165,233,0.2))",
          borderRadius: 1,
        }} />

        {/* Level nodes */}
        {ZENITH_NODES.map((n) => {
          const isZenith = n.pct === 100;
          const isPast = n.pct <= USER_PCT;
          const dotSize = isZenith ? 10 : 6;

          return (
            <div
              key={n.label}
              style={{
                position: "absolute" as const,
                bottom: `${n.pct}%`,
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
                marginRight: 12,
                background: isZenith
                  ? "radial-gradient(circle at 40% 35%, #F5C842, #C4862B)"
                  : isPast
                    ? "rgba(14,165,233,0.75)"
                    : "rgba(255,255,255,0.1)",
                border: isZenith ? "none" : "none",
                animation: isZenith ? "zenithNodeGlow 3s ease-in-out infinite" : "none",
              }} />

              {/* Label */}
              <span style={{
                fontSize: isZenith ? 12 : 10,
                fontWeight: isZenith ? 700 : isPast ? 500 : 400,
                letterSpacing: isZenith ? "0.06em" : "0.02em",
                color: isZenith
                  ? "#F5C842"
                  : isPast
                    ? "rgba(255,255,255,0.55)"
                    : "rgba(255,255,255,0.18)",
                filter: isZenith
                  ? "drop-shadow(0 0 7px rgba(245,200,66,0.5))"
                  : "none",
              }}>
                {n.label}
              </span>
            </div>
          );
        })}

        {/* User dot — pulsing indicator */}
        <div style={{
          position: "absolute" as const,
          bottom: `${USER_PCT}%`,
          left: TRACK_L,
          transform: "translate(-50%, 50%)",
          width: 11, height: 11,
          borderRadius: "50%",
          background: "#38BDF8",
          animation: "userLocPulse 2.2s ease-in-out infinite",
          zIndex: 2,
        }} />
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 18, paddingTop: 18,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <p style={{
          margin: 0, fontSize: 13,
          color: "rgba(255,255,255,0.36)",
          lineHeight: 1.65, fontWeight: 400,
        }}>
          Algunas cimas cambian tu nivel.{" "}
          <em style={{ color: "rgba(255,255,255,0.58)", fontStyle: "italic" }}>
            Otras cambian quién eres.
          </em>
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
        /* ── Zenith node glow ── */
        @keyframes zenithNodeGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(245,200,66,0.55), 0 0 24px rgba(245,200,66,0.28); }
          50%       { box-shadow: 0 0 18px rgba(245,200,66,0.85), 0 0 40px rgba(245,200,66,0.45); }
        }

        /* ── User location pulse ── */
        @keyframes userLocPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(56,189,248,0.2), 0 0 14px rgba(56,189,248,0.55); }
          50%       { box-shadow: 0 0 0 5px rgba(56,189,248,0.1), 0 0 22px rgba(56,189,248,0.8); }
        }

        /* ── Card 2 badge — looping cycle ── */
        @keyframes socBadgeCycle {
          0%, 55%, 100% {
            background: rgba(255,255,255,0.025);
            border-color: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.18);
            box-shadow: none;
          }
          18%, 42% {
            background: rgba(47,122,95,0.16);
            border-color: rgba(47,122,95,0.38);
            color: rgba(255,255,255,0.92);
            box-shadow: 0 0 22px rgba(47,122,95,0.18);
          }
        }

        /* ── Card 2 after row pulse ── */
        @keyframes socAfterCycle {
          0%, 55%, 100% { background: rgba(14,165,233,0.07); }
          18%, 42%      { background: rgba(14,165,233,0.16); }
        }

        .soc-badge {
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.18);
          animation: socBadgeCycle 6s ease-in-out 1.5s infinite;
        }

        .soc-after-row {
          background: rgba(14,165,233,0.07);
          animation: socAfterCycle 6s ease-in-out 1.5s infinite;
        }

        /* ── Responsive ── */
        @media (max-width: 767px) {
          .soc-cards { flex-direction: column !important; }
          .soc-cards > * { min-height: 280px; }
        }

        /* ── Reduce motion ── */
        @media (prefers-reduced-motion: reduce) {
          .soc-badge, .soc-after-row { animation: none !important; }
          [style*="zenithNodeGlow"], [style*="userLocPulse"] { animation: none !important; }
        }
      `}</style>

      <section
        ref={sectionRef}
        style={{
          background: "#F6F4F0",
          padding: "100px 0 120px",
          position: "relative" as const,
        }}
      >
        {/* Very faint warm pattern overlay */}
        <div style={{
          position: "absolute" as const, inset: 0,
          backgroundImage: "radial-gradient(circle at 70% 30%, rgba(47,122,95,0.04) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(13,37,56,0.03) 0%, transparent 50%)",
          pointerEvents: "none",
        }} />

        <div className="ld-container" style={{ position: "relative" as const }}>
          {/* Editorial header */}
          <div style={{
            marginBottom: 64,
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(22px)",
            transition: "opacity 0.75s ease, transform 0.75s ease",
          }}>
            <p className="ld-section-label" style={{ margin: "0 0 16px" }}>
              Sistema social
            </p>
            <h2 className="ld-display ld-section-title" style={{ margin: "0 0 16px" }}>
              La montaña también<br />se comparte.
            </h2>
            <p className="ld-section-sub">
              Compite con tu cordada, escala posiciones y evoluciona como montañero.
            </p>
          </div>

          {/* Three premium cards */}
          <div className="soc-cards" style={{
            display: "flex",
            gap: 20,
            alignItems: "stretch",
          }}>
            <CardCordada revealed={revealed} />
            <CardClimb  revealed={revealed} />
            <CardZenith  revealed={revealed} />
          </div>
        </div>
      </section>
    </>
  );
}
