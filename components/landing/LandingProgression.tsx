"use client";

import { useEffect, useRef, useState } from "react";

// 1718 × 916 image → padding-top = 916/1718 * 100 = 53.32%
const IMG_PT = (916 / 1718) * 100;

// lx/ly = % of image width/height for each summit center
// connH = connector line height in px — grows with level to amplify staircase
const LEVELS = [
  { name: "Scout",     ascents: 20,  altReq: "1 500 m",  lx: 10,    ly: 68, connH: 30 },
  { name: "Guide",     ascents: 50,  altReq: "3 000 m",  lx: 27.5,  ly: 55, connH: 12 },
  { name: "Explorer",  ascents: 100, altReq: "4 500 m",  lx: 48,    ly: 55, connH: 53 },
  { name: "Master",    ascents: 150, altReq: "6 000 m",  lx: 66.25, ly: 48, connH: 63 },
  { name: "Legendary", ascents: null, altReq: null,      lx: 85.5,  ly: 33, connH: 59 },
] as const;

const RARITIES = [
  { label: "Daisy",      ep: 10,   color: "#5B8C6F" },
  { label: "Heather",    ep: 20,   color: "#6A9BAE" },
  { label: "Gentian",    ep: 30,   color: "#8A7BB0" },
  { label: "Tundra",     ep: 60,   color: "#6B8FA8" },
  { label: "Edelweiss",  ep: 120,  color: "#9B8B70" },
  { label: "Draba",      ep: 250,  color: "#A07868" },
  { label: "Saxifrage",  ep: 500,  color: "#A88055" },
  { label: "Cinquefoil", ep: 1000, color: "#A89060" },
  { label: "Snow Lotus", ep: 2000, color: "#8A9BAE" },
] as const;

const RANKING = [
  { name: "Oriol Casanovas", initials: "OC", color: "#00995C", ascents: 48, ep: 2760, isMe: false },
  { name: "Tú",              initials: "TÚ", color: "#0EA5E9", ascents: 38, ep: 1980, isMe: true  },
  { name: "Marta Ribagorza", initials: "MR", color: "#0E7490", ascents: 31, ep: 1420, isMe: false },
] as const;

// ─── Icons (monoline) ─────────────────────────────────────────────────────────

function LevelIcon({ name, color }: { name: string; color: string }) {
  const s = { stroke: color, strokeWidth: 1.4, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "Scout":
      return (
        <svg width={15} height={15} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3.5" {...s} />
          <circle cx="12" cy="12" r="8.5" {...s} strokeOpacity={0.35} />
        </svg>
      );
    case "Guide":
      return (
        <svg width={15} height={15} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" {...s} />
          <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" {...s} />
        </svg>
      );
    case "Explorer":
      return (
        <svg width={15} height={15} viewBox="0 0 24 24">
          <ellipse cx="12" cy="12" rx="3.5" ry="2.2" {...s} />
          <ellipse cx="12" cy="12" rx="7.5" ry="4.8" {...s} strokeOpacity={0.5} />
          <ellipse cx="12" cy="12" rx="11" ry="7.5" {...s} strokeOpacity={0.22} />
        </svg>
      );
    case "Master":
      return (
        <svg width={15} height={15} viewBox="0 0 24 24">
          <polyline points="12,3 21,20 3,20" {...s} />
          <line x1="12" y1="10" x2="12" y2="15" {...s} strokeOpacity={0.4} />
        </svg>
      );
    case "Legendary":
      return (
        <svg width={15} height={15} viewBox="0 0 24 24">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" {...s} />
        </svg>
      );
    default: return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LandingProgression() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const thresholds = [0.04, 0.18, 0.34, 0.50, 0.64];
    const onScroll = () => {
      const { top, height } = el.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -top / (height - window.innerHeight)));
      setRevealed(thresholds.filter(t => progress >= t).length);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const lp = "clamp(24px, calc((100vw - 1160px) / 2 + 24px), 180px)";

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .pg-sticky   { position: static !important; height: auto !important; overflow: visible !important; }
          .pg-main     { flex-direction: column !important; }
          .pg-left     { width: 100% !important; padding-bottom: 0 !important; padding-right: 24px !important; }
          .pg-right    { min-height: 320px; }
          .pg-bar      { padding-left: 24px !important; padding-right: 24px !important; flex-wrap: wrap; gap: 8px !important; }
        }
      `}</style>

      <section
        ref={sectionRef}
        style={{ height: "300vh", background: "#F6F8FA", position: "relative" }}
      >
        <div
          className="pg-sticky"
          style={{
            position: "sticky",
            top: 0,
            height: "100svh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── Two-column content row ── */}
          <div
            className="pg-main"
            style={{ flex: 1, display: "flex", minHeight: 0 }}
          >
            {/* ── LEFT: editorial text ── */}
            <div
              className="pg-left"
              style={{
                width: "46%",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                paddingLeft: lp,
                paddingRight: "clamp(28px, 3.5vw, 56px)",
                paddingTop: 72,
                paddingBottom: 32,
                position: "relative",
                zIndex: 2,
              }}
            >
              {/* Eyebrow */}
              <p className="ld-section-label" style={{ margin: "0 0 16px" }}>
                Sistema de progresión
              </p>

              {/* Headline */}
              <h2 className="ld-display ld-section-title" style={{ margin: "0 0 20px" }}>
                Cada cima suma.<br />
                <span style={{ color: "var(--ld-gold)", whiteSpace: "nowrap" }}>Tu leyenda evoluciona.</span>
              </h2>

              {/* Body */}
              <p className="ld-section-sub" style={{ margin: "0 0 32px", maxWidth: 300 }}>
                Cinco rangos definen tu camino como montañero.
              </p>

              {/* Rarity section */}
              <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 20 }}>
                <p style={{
                  margin: "0 0 12px",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "#b0b7c3",
                }}>
                  Rarezas · Puntos de elevación
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {RARITIES.map((r, i) => (
                    <div
                      key={r.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: i === RARITIES.length - 1 ? 4 : 0,
                        filter: i === RARITIES.length - 1
                          ? "drop-shadow(0 0 7px rgba(138,175,200,0.35))"
                          : undefined,
                      }}
                    >
                      <span style={{
                        width: 6, height: 6,
                        borderRadius: "50%",
                        background: r.color,
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#0D2538",
                        letterSpacing: "0.01em",
                      }}>
                        {r.label}
                      </span>
                      <span style={{ color: "rgba(13,37,56,0.3)", fontSize: 11 }}>·</span>
                      <span style={{
                        fontSize: 11,
                        color: "rgba(13,37,56,0.4)",
                        fontFamily: "var(--font-mono-landing, monospace)",
                      }}>
                        {r.ep} EP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT: mountain illustration + level nodes ── */}
            <div
              className="pg-right"
              style={{ flex: 1, position: "relative" }}
            >
              {/* Soft left-edge blend */}
              <div style={{
                position: "absolute",
                top: 0, left: 0, bottom: 0,
                width: 80,
                background: "linear-gradient(to right, #F6F8FA 10%, transparent)",
                zIndex: 4,
                pointerEvents: "none",
              }} />

              {/* Mountain wrapper — aspect-ratio locked, bottom-anchored */}
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                paddingTop: `${IMG_PT}%`,
              }}>
                {/* Mountain image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/mountain-progression.png"
                  alt=""
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />

                {/* Level nodes — positioned as % of image */}
                {LEVELS.map((l, i) => {
                  const on = revealed > i;
                  return (
                    <div
                      key={l.name}
                      style={{
                        position: "absolute",
                        left: `${l.lx}%`,
                        top: `${l.ly}%`,
                        zIndex: 10 + i,
                      }}
                    >
                      {/* Editorial annotation — floats above summit */}
                      <div style={{
                        position: "absolute",
                        bottom: 2,
                        left: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        opacity: on ? 1 : 0,
                        transform: on
                          ? "translateX(-50%) translateY(-46px)"
                          : "translateX(-50%) translateY(-34px)",
                        transition: `opacity 0.8s ease ${i * 0.18}s, transform 0.8s ease ${i * 0.18}s`,
                        pointerEvents: "none",
                      }}>
                        <div style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: l.name === "Legendary" ? 7 : 3,
                          whiteSpace: "nowrap",
                          padding: l.name === "Legendary" ? "0 6px" : undefined,
                          filter: l.name === "Legendary" && on
                            ? "drop-shadow(0 0 12px rgba(196,140,50,0.22))"
                            : undefined,
                        }}>
                          <div style={{
                            fontWeight: 500,
                            fontSize: 11,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: l.name === "Legendary" ? "#C4862B" : "#0D2538",
                          }}>
                            {l.name}
                          </div>
                          <div style={{
                            fontSize: 10,
                            letterSpacing: "0.04em",
                            color: "rgba(13,37,56,0.28)",
                            lineHeight: 1.9,
                            textAlign: "center",
                          }}>
                            {l.ascents != null && <div>{l.ascents} ascensiones</div>}
                            {l.altReq != null && <div>{l.altReq}</div>}
                          </div>
                        </div>
                        <div style={{
                          width: 5, height: 5,
                          borderRadius: "50%",
                          background: l.name === "Legendary" ? "#C4862B" : "#fff",
                          border: `1px solid ${l.name === "Legendary" ? "#C4862B" : "rgba(13,37,56,0.28)"}`,
                          flexShrink: 0,
                          margin: l.name === "Legendary" ? "10px 0 0" : "7px 0 0",
                          boxShadow: l.name === "Legendary" && on ? "0 0 8px rgba(196,134,43,0.35)" : undefined,
                        }} />
                        <div style={{
                          width: 1,
                          height: l.connH,
                          flexShrink: 0,
                          background: l.name === "Legendary"
                            ? "linear-gradient(to bottom, rgba(196,134,43,0.28), transparent)"
                            : "linear-gradient(to bottom, rgba(13,37,56,0.18), transparent)",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── BOTTOM BAR: cordada ranking ── */}
          <div
            className="pg-bar"
            style={{
              borderTop: "1px solid rgba(0,0,0,0.05)",
              background: "rgba(255,255,255,0.52)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: lp,
              paddingRight: 32,
              display: "flex",
              alignItems: "center",
              gap: 20,
              flexShrink: 0,
            }}
          >
            <span style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "#b0b7c3",
              whiteSpace: "nowrap",
            }}>
              Tu cordada
            </span>

            {RANKING.map((r) => (
              <div
                key={r.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 11px",
                  borderRadius: 20,
                  background: r.isMe ? "rgba(14,165,233,0.07)" : "transparent",
                  border: r.isMe ? "1px solid rgba(14,165,233,0.18)" : "1px solid transparent",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 22, height: 22,
                  borderRadius: "50%",
                  background: r.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 7.5,
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: "0.03em",
                  flexShrink: 0,
                }}>
                  {r.initials}
                </div>

                <span style={{
                  fontSize: 12,
                  fontWeight: r.isMe ? 600 : 400,
                  color: r.isMe ? "#0f1117" : "#4b5563",
                }}>
                  {r.name}
                </span>

                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                  {r.ascents} cimas · {r.ep} EP
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
