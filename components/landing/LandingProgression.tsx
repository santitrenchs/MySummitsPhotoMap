"use client";

import { useEffect, useRef, useState } from "react";

// 1718 × 916 image → padding-top = 916/1718 * 100 = 53.32%
const IMG_PT = (916 / 1718) * 100;

// lx/ly = % of image width/height for each summit center
const LEVELS = [
  { name: "Scout",     ascents: 20,  altReq: "≥ 1 500 m",  lx: 9,    ly: 71,  color: "#4A8C70" },
  { name: "Guide",     ascents: 50,  altReq: "≥ 3 000 m",  lx: 28.5, ly: 63,  color: "#5B80A8" },
  { name: "Explorer",  ascents: 100, altReq: "≥ 4 500 m",  lx: 49,   ly: 66,  color: "#7C70AA" },
  { name: "Master",    ascents: 150, altReq: "≥ 6 000 m",  lx: 65.5, ly: 58,  color: "#9B7B60" },
  { name: "Legendary", ascents: null, altReq: "Nivel máximo", lx: 81.5, ly: 53, color: "#B08940" },
] as const;

const RARITIES = [
  { label: "Daisy",      ep: 10,   color: "#00995C" },
  { label: "Heather",    ep: 20,   color: "#06B6D4" },
  { label: "Gentian",    ep: 30,   color: "#3B82F6" },
  { label: "Tundra",     ep: 60,   color: "#0EA5E9" },
  { label: "Edelweiss",  ep: 120,  color: "#A855F7" },
  { label: "Draba",      ep: 250,  color: "#EC4899" },
  { label: "Saxifrage",  ep: 500,  color: "#F97316" },
  { label: "Cinquefoil", ep: 1000, color: "#EAB308" },
  { label: "Snow Lotus", ep: 2000, color: "#94A3B8" },
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
    const thresholds = [0.04, 0.22, 0.42, 0.62, 0.81];
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
              <p style={{
                margin: "0 0 16px",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#9ca3af",
              }}>
                Sistema de progresión
              </p>

              {/* Headline */}
              <h2 style={{
                margin: "0 0 18px",
                fontSize: "clamp(26px, 3.2vw, 44px)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
                color: "#0f1117",
              }}>
                Cada cumbre<br />te acerca<br />a la leyenda
              </h2>

              {/* Body */}
              <p style={{
                margin: "0 0 32px",
                fontSize: 14,
                lineHeight: 1.7,
                color: "#4b5563",
                maxWidth: 300,
              }}>
                Cinco rangos que reconocen tu evolución como montañero.
                Cada ascensión suma. Cada altitud exige más.
              </p>

              {/* Rarity section */}
              <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 20 }}>
                <p style={{
                  margin: "0 0 10px",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "#b0b7c3",
                }}>
                  Rarezas · Puntos de elevación
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 5px" }}>
                  {RARITIES.map(r => (
                    <span
                      key={r.label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "2px 8px",
                        borderRadius: 100,
                        border: "1px solid rgba(0,0,0,0.07)",
                        background: "rgba(255,255,255,0.55)",
                        fontSize: 9.5,
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      <span style={{
                        width: 5, height: 5,
                        borderRadius: "50%",
                        background: r.color,
                        flexShrink: 0,
                      }} />
                      {r.label}
                      <span style={{ color: "#b0b7c3", fontWeight: 400 }}>{r.ep} EP</span>
                    </span>
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
                      {/* Summit dot */}
                      <div style={{
                        position: "absolute",
                        width: 8, height: 8,
                        borderRadius: "50%",
                        background: l.color,
                        border: "2px solid rgba(255,255,255,0.95)",
                        transform: "translate(-50%, -50%)",
                        boxShadow: `0 0 10px ${l.color}55`,
                        opacity: on ? 1 : 0,
                        transition: `opacity 0.45s ease ${i * 0.16}s`,
                      }} />

                      {/* Card + connector floating above summit */}
                      <div style={{
                        position: "absolute",
                        bottom: 2,
                        left: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        opacity: on ? 1 : 0,
                        transform: on
                          ? "translateX(-50%) translateY(-16px)"
                          : "translateX(-50%) translateY(-6px)",
                        transition: `opacity 0.72s ease ${i * 0.16}s, transform 0.72s ease ${i * 0.16}s`,
                        pointerEvents: "none",
                      }}>
                        {/* Glass card */}
                        <div style={{
                          background: "rgba(255,255,255,0.82)",
                          backdropFilter: "blur(20px)",
                          WebkitBackdropFilter: "blur(20px)",
                          border: "1px solid rgba(255,255,255,0.9)",
                          borderRadius: 11,
                          padding: "9px 13px",
                          boxShadow: "0 2px 18px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 5,
                          minWidth: 104,
                          whiteSpace: "nowrap",
                        }}>
                          <LevelIcon name={l.name} color={l.color} />
                          <div style={{
                            fontWeight: 600,
                            fontSize: 10,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "#111827",
                          }}>
                            {l.name}
                          </div>
                          <div style={{ fontSize: 9.5, lineHeight: 1.55, textAlign: "center", color: "#6b7280" }}>
                            {l.ascents != null && <div>{l.ascents} ascensiones</div>}
                            <div style={{ color: l.color + "C8" }}>{l.altReq}</div>
                          </div>
                        </div>

                        {/* Connector line */}
                        <div style={{
                          width: 1,
                          height: 18,
                          flexShrink: 0,
                          background: `linear-gradient(to bottom, ${l.color}55, transparent)`,
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
