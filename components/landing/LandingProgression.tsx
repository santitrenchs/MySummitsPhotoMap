"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Data ─────────────────────────────────────────────────────────────────────

const LEVELS = [
  { name: "Scout",     color: "#22c55e", rgb: "34,197,94",   ascents: 20,  altK: 1.5  },
  { name: "Guide",     color: "#06B6D4", rgb: "6,182,212",   ascents: 50,  altK: 3.0  },
  { name: "Explorer",  color: "#A855F7", rgb: "168,85,247",  ascents: 100, altK: 4.5  },
  { name: "Master",    color: "#F97316", rgb: "249,115,22",  ascents: 150, altK: 6.0  },
  { name: "Legendary", color: "#F5C842", rgb: "245,200,66",  ascents: null, altK: null },
] as const;

// Peak SVG coords (viewBox 0 0 1000 560): x, y=peak top (0=top of SVG)
const PEAKS = [
  { ...LEVELS[0], svgX: 110,  svgY: 380 },
  { ...LEVELS[1], svgX: 270,  svgY: 300 },
  { ...LEVELS[2], svgX: 480,  svgY: 210 },
  { ...LEVELS[3], svgX: 690,  svgY: 120 },
  { ...LEVELS[4], svgX: 900,  svgY: 42  },
] as const;

const RARITIES = [
  { label: "Daisy",      ep: 10,   color: "#00995C", rgb: "0,153,92"    },
  { label: "Heather",    ep: 20,   color: "#06B6D4", rgb: "6,182,212"   },
  { label: "Gentian",    ep: 30,   color: "#3B82F6", rgb: "59,130,246"  },
  { label: "Tundra",     ep: 60,   color: "#0EA5E9", rgb: "14,165,233"  },
  { label: "Edelweiss",  ep: 120,  color: "#A855F7", rgb: "168,85,247"  },
  { label: "Draba",      ep: 250,  color: "#EC4899", rgb: "236,72,153"  },
  { label: "Saxifrage",  ep: 500,  color: "#F97316", rgb: "249,115,22"  },
  { label: "Cinquefoil", ep: 1000, color: "#EAB308", rgb: "234,179,8"   },
  { label: "Snow Lotus", ep: 2000, color: "#CBD5E1", rgb: "203,213,225" },
] as const;

const RANKING = [
  { rank: 1, name: "Oriol Casanovas", initials: "OC", color: "#00995C", ascents: 48, cairns: 3, ep: 2760, isMe: false },
  { rank: 2, name: "Tú",              initials: "TÚ", color: "#0EA5E9", ascents: 38, cairns: 2, ep: 1980, isMe: true  },
  { rank: 3, name: "Marta Ribagorza", initials: "MR", color: "#0E7490", ascents: 31, cairns: 1, ep: 1420, isMe: false },
];

// ─── Monoline level icons ──────────────────────────────────────────────────────

function LevelIcon({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  switch (name) {
    case "Scout":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth="1.6"/>
          <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="0.8" strokeDasharray="2 2.5"/>
        </svg>
      );
    case "Guide":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.1"/>
          <line x1="12" y1="3.5" x2="12" y2="7"    stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
          <line x1="12" y1="17"  x2="12" y2="20.5"  stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
          <line x1="3.5" y1="12" x2="7"   y2="12"   stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
          <line x1="17"  y1="12" x2="20.5" y2="12"  stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="1.8" fill={color}/>
        </svg>
      );
    case "Explorer":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 21.5C7 21.5 2.5 17 2.5 12S7 2.5 12 2.5" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
          <path d="M12 17.5C9 17.5 6.5 15 6.5 12S9 6.5 12 6.5" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
          <path d="M12 13.5C11.2 13.5 10.5 12.8 10.5 12S11.2 10.5 12 10.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="1.4" fill={color}/>
          <path d="M12 2.5C17 2.5 21.5 7 21.5 12S17 21.5 12 21.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.28"/>
          <path d="M12 6.5C15 6.5 17.5 9 17.5 12S15 17.5 12 17.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.28"/>
        </svg>
      );
    case "Master":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 3L21 20H3Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M12 3L8 14H16Z" stroke={color} strokeWidth="0.9" strokeLinejoin="round" strokeOpacity="0.42"/>
        </svg>
      );
    case "Legendary":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 2.5L13.6 9.8L20.5 7.2L15.8 12.6L22 14.8L14.8 15.8L16.2 22.5L12 17L7.8 22.5L9.2 15.8L2 14.8L8.2 12.6L3.5 7.2L10.4 9.8Z"
            stroke={color} strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      );
    default: return null;
  }
}

// ─── Mini cairn icon ───────────────────────────────────────────────────────────

function MiniCairn() {
  return (
    <svg width="11" height="14" viewBox="0 0 11 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <ellipse cx="5.5" cy="12.5" rx="4.5" ry="1.4" fill="rgba(13,37,56,0.10)"/>
      <ellipse cx="5.5" cy="11"   rx="4"   ry="1.7" fill="#8C9BAA"/>
      <ellipse cx="5.5" cy="8.2"  rx="3"   ry="1.5" fill="#9CAAB8"/>
      <ellipse cx="5.5" cy="5.8"  rx="2.1" ry="1.3" fill="#AABBC9"/>
      <ellipse cx="5.5" cy="3.7"  rx="1.5" ry="1.1" fill="#B8C8D5"/>
      <ellipse cx="5.5" cy="1.9"  rx="1"   ry="0.9" fill="#D4A017"/>
    </svg>
  );
}

// ─── Scene 1 mountain range SVG ───────────────────────────────────────────────
// ViewBox 0 0 1000 560. Peaks at defined PEAKS coordinates.

const RIDGE =
  "M 0,490 " +
  "C 40,478 75,448 110,380 " +      // up to Scout
  "C 135,338 155,395 185,428 " +    // down
  "C 215,460 238,432 270,300 " +    // up to Guide
  "C 295,228 318,290 352,355 " +    // down
  "C 375,395 400,360 440,302 " +    // transition
  "C 456,278 468,228 480,210 " +    // up to Explorer
  "C 492,192 516,238 550,278 " +    // down
  "C 580,308 618,285 655,248 " +    // climbing
  "C 672,228 681,130 690,120 " +    // up to Master
  "C 700,112 726,152 762,188 " +    // down
  "C 800,225 840,208 870,178 " +    // climbing toward Legendary
  "C 886,160 895,55 900,42 " +      // up to Legendary
  "C 906,32 918,62 938,95 " +       // down
  "C 965,142 1000,185 1000,220";

const RIDGE_FILL = RIDGE + " L 1000,560 L 0,560 Z";

const RIDGE_BACK =
  "M 0,520 C 120,500 250,460 380,410 C 500,360 620,320 740,260 " +
  "C 840,210 920,170 1000,130 L 1000,560 L 0,560 Z";

function MountainRangeSVG() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      viewBox="0 0 1000 560"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="mtBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(13,37,56,0)"/>
          <stop offset="100%" stopColor="rgba(13,37,56,0.038)"/>
        </linearGradient>
        <linearGradient id="mtMain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(13,37,56,0.01)"/>
          <stop offset="100%" stopColor="rgba(13,37,56,0.07)"/>
        </linearGradient>
        <linearGradient id="mtRidge" x1="0%" y1="0" x2="100%" y2="0">
          <stop offset="0%"   stopColor="rgba(34,197,94,0.38)"/>
          <stop offset="25%"  stopColor="rgba(6,182,212,0.48)"/>
          <stop offset="50%"  stopColor="rgba(168,85,247,0.52)"/>
          <stop offset="75%"  stopColor="rgba(249,115,22,0.56)"/>
          <stop offset="100%" stopColor="rgba(245,200,66,0.82)"/>
        </linearGradient>
        <filter id="rGlow"><feGaussianBlur stdDeviation="2.5"/></filter>
      </defs>

      {/* Back range — depth */}
      <path d={RIDGE_BACK} fill="url(#mtBack)"/>

      {/* Main range */}
      <path d={RIDGE_FILL} fill="url(#mtMain)"/>

      {/* Ridgeline glow */}
      <path d={RIDGE} stroke="rgba(168,85,247,0.13)" strokeWidth="7"
        fill="none" filter="url(#rGlow)"/>

      {/* Ridgeline */}
      <path d={RIDGE} stroke="url(#mtRidge)" strokeWidth="1.4"
        fill="none" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Peak glow rings + dots */}
      {PEAKS.map((p) => (
        <g key={p.name}>
          <circle cx={p.svgX} cy={p.svgY} r={14} fill={p.color} opacity={0.10}/>
          <circle cx={p.svgX} cy={p.svgY} r={4.5} fill={p.color} opacity={0.85}/>
        </g>
      ))}
    </svg>
  );
}

// ─── Scene 1: La Ascensión ────────────────────────────────────────────────────

function SceneAscent({ active }: { active: boolean }) {
  return (
    <div className="pg-scene pg-s1">
      {/* ── Left: copy + rarity strip ── */}
      <div className="pg-s1-left">
        <div className="pg-ch-eyebrow">01 · EL CAMINO DEL MONTAÑERO</div>
        <h3 className="pg-ch-heading">De excursionista<br/>a leyenda.</h3>
        <p className="pg-ch-body">
          Cada ascensión suma. Las cimas más altas otorgan rarezas más valiosas y aceleran tu escalada de nivel.
        </p>

        <div className="pg-rarity-strip">
          {RARITIES.map((r) => (
            <div key={r.label} className="pg-rarity-pill"
              style={{ "--rgb": r.rgb } as React.CSSProperties}>
              <span className="pg-rarity-dot" style={{ background: r.color }}/>
              <span className="pg-rarity-name" style={{ color: r.color }}>{r.label}</span>
              <span className="pg-rarity-ep">
                +{r.ep >= 1000 ? `${r.ep / 1000}k` : r.ep} EP
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: mountain range with peak nodes ── */}
      <div className="pg-s1-right">
        <MountainRangeSVG/>

        {/* Level badges overlaid on peaks */}
        <div className="pg-peaks-overlay">
          {PEAKS.map((p, i) => {
            // Convert SVG coords to % of container
            const leftPct  = (p.svgX / 1000) * 100;
            const botPct   = ((560 - p.svgY) / 560) * 100;
            return (
              <div
                key={p.name}
                className={`pg-peak-node${active ? " pg-peak-on" : ""}`}
                style={{
                  left: `${leftPct}%`,
                  bottom: `${botPct}%`,
                  "--c":   p.color,
                  "--rgb": p.rgb,
                  "--d":   `${i * 0.14}s`,
                } as React.CSSProperties}
              >
                {/* Badge */}
                <div className="pg-peak-badge">
                  <LevelIcon name={p.name} color={p.color} size={18}/>
                  <div className="pg-peak-name">{p.name}</div>
                  <div className="pg-peak-reqs">
                    {p.ascents !== null ? `${p.ascents} cimas` : "sin límite"}
                    {p.altK !== null && ` · ≥${p.altK}k m`}
                  </div>
                </div>
                {/* Connector to SVG dot */}
                <div className="pg-peak-connector"/>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Scene 2: Tu Cordada ──────────────────────────────────────────────────────

function SceneCordada({ active }: { active: boolean }) {
  return (
    <div className="pg-scene pg-s2">
      {/* ── Left: copy ── */}
      <div className="pg-s2-left">
        <div className="pg-ch-eyebrow">02 · TU CORDADA</div>
        <h3 className="pg-ch-heading">Tu círculo<br/>de cumbre.</h3>
        <p className="pg-ch-body">
          El ranking es entre amigos. Ascensiones, Cairns de cimas Mythic y EP totales son los criterios.
        </p>
        <div className="pg-criteria">
          <div className="pg-criteria-chip">Ascensiones</div>
          <div className="pg-criteria-chip">
            <MiniCairn/> Cairns Mythic
          </div>
          <div className="pg-criteria-chip">EP Totales</div>
        </div>
        <p className="pg-ch-note" style={{ marginTop: 20 }}>
          Solo tus amigos aparecen en el ranking.
        </p>
      </div>

      {/* ── Right: cordada visual ── */}
      <div className="pg-s2-right">
        <div className={`pg-cordada${active ? " pg-cordada-on" : ""}`}>

          {/* Rope SVG behind the nodes */}
          <svg className="pg-rope-svg" viewBox="0 0 2 340" preserveAspectRatio="none">
            <line x1="1" y1="0" x2="1" y2="340"
              stroke="rgba(13,37,56,0.09)" strokeWidth="2" strokeDasharray="4 5"/>
          </svg>

          {RANKING.map((entry, i) => (
            <div
              key={entry.rank}
              className={`pg-crd-member${entry.isMe ? " pg-crd-me" : ""}`}
              style={{ "--d": `${i * 0.18}s` } as React.CSSProperties}
            >
              {/* Avatar */}
              <div className="pg-crd-avatar"
                style={{
                  background: entry.color,
                  boxShadow: entry.isMe
                    ? `0 0 0 3px rgba(14,165,233,0.18), 0 0 22px rgba(14,165,233,0.18)`
                    : "none",
                  outline: entry.isMe ? `2.5px solid ${entry.color}` : "none",
                  outlineOffset: "3px",
                }}>
                {entry.initials}
              </div>

              {/* Info */}
              <div className="pg-crd-info">
                <div className="pg-crd-name">
                  {entry.name}
                  {entry.isMe && <span className="pg-crd-you"> · tú</span>}
                </div>
                <div className="pg-crd-stats">
                  <span>{entry.ascents} cimas</span>
                  {entry.cairns > 0 && (
                    <span className="pg-crd-cairns">
                      <MiniCairn/>
                      {entry.cairns}
                    </span>
                  )}
                  <span className="pg-crd-ep">{entry.ep.toLocaleString("es")} EP</span>
                </div>
              </div>

              {/* Rank */}
              <div className="pg-crd-rank"
                style={{ color: i === 0 ? "#C49A0C" : "rgba(13,37,56,0.22)" }}>
                #{entry.rank}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function LandingProgression() {
  const outerRef  = useRef<HTMLDivElement>(null);
  const trackRef  = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number>(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const track = trackRef.current;
    if (!outer || !track) return;

    const tick = () => {
      if (window.innerWidth < 640) return;
      const rect = outer.getBoundingClientRect();
      const scrollable = outer.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
      track.style.transform = `translateX(-${progress * window.innerWidth}px)`;
      setActive(progress > 0.5 ? 1 : 0);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    tick();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <section className="pg-section">

        <div ref={outerRef} className="pg-outer">
          <div className="pg-sticky">

            {/* 2-dot nav */}
            <div className="pg-nav">
              {["La Ascensión", "Tu Cordada"].map((label, i) => (
                <div key={i} className={`pg-nav-item${active === i ? " pg-nav-on" : ""}`}>
                  <div className="pg-nav-dot"/>
                  <span className="pg-nav-label">{label}</span>
                </div>
              ))}
            </div>

            <div ref={trackRef} className="pg-track">
              <SceneAscent  active={active === 0}/>
              <SceneCordada active={active === 1}/>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="pg-final">
          <blockquote className="pg-final-quote">
            "No coleccionas cimas.<br/>Construyes una historia de montaña."
          </blockquote>
          <Link href="/register" className="pg-final-btn">
            Empieza tu ascensión →
          </Link>
        </div>

      </section>
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@keyframes pgLegendaryAurora {
  0%,100% { box-shadow: 0 0 14px rgba(245,200,66,0.38), 0 0 28px rgba(245,200,66,0.16); }
  50%     { box-shadow: 0 0 26px rgba(245,200,66,0.62), 0 0 52px rgba(245,200,66,0.28); }
}
@keyframes pgPeakIn {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ── Section ── */
.pg-section { background: #F4F7FA; position: relative; }

/* ── Scroll zone ── */
.pg-outer  { height: 220vh; position: relative; }
.pg-sticky { position: sticky; top: 0; height: 100svh; overflow: hidden; }
.pg-track  { display: flex; width: 200vw; height: 100%; will-change: transform; }

/* ── Nav dots ── */
.pg-nav {
  position: absolute; bottom: 28px; left: 50%;
  transform: translateX(-50%);
  display: flex; gap: 28px; z-index: 20;
}
.pg-nav-item { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.pg-nav-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: rgba(13,37,56,0.18);
  transition: background 0.35s, box-shadow 0.35s, transform 0.35s;
}
.pg-nav-on .pg-nav-dot {
  background: rgba(13,37,56,0.70);
  box-shadow: 0 0 8px rgba(13,37,56,0.18);
  transform: scale(1.3);
}
.pg-nav-label {
  font-size: 9px; font-weight: 600; letter-spacing: 0.10em;
  color: rgba(13,37,56,0.22); text-transform: uppercase;
  transition: color 0.35s;
}
.pg-nav-on .pg-nav-label { color: rgba(13,37,56,0.55); }

/* ── Scene base ── */
.pg-scene {
  width: 100vw; height: 100%;
  flex-shrink: 0;
  display: grid;
  position: relative;
  overflow: hidden;
}

/* ── Scene 1 layout ── */
.pg-s1 { grid-template-columns: minmax(280px, 40%) 1fr; }

.pg-s1-left {
  display: flex; flex-direction: column; justify-content: center;
  padding: 0 40px 0 clamp(24px, calc((100vw - 1160px) / 2 + 24px), 180px);
  z-index: 2;
}

.pg-s1-right {
  position: relative;
  overflow: hidden;
}

/* ── Rarity strip ── */
.pg-rarity-strip {
  display: flex; flex-wrap: wrap; gap: 5px; margin-top: 28px;
}
.pg-rarity-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px;
  border-radius: 100px;
  border: 1px solid rgba(var(--rgb), 0.20);
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(4px);
}
.pg-rarity-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.pg-rarity-name { font-size: 10px; font-weight: 700; letter-spacing: 0.02em; }
.pg-rarity-ep { font-size: 9px; color: rgba(13,37,56,0.38); font-weight: 600; }

/* ── Peak nodes overlay ── */
.pg-peaks-overlay {
  position: absolute; inset: 0; pointer-events: none; z-index: 2;
}
.pg-peak-node {
  position: absolute;
  transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center;
  opacity: 0;
  transition: opacity 0.55s ease var(--d);
}
.pg-peak-on { opacity: 1; }
.pg-peak-badge {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--rgb), 0.28);
  border-radius: 10px;
  padding: 7px 11px;
  box-shadow: 0 3px 14px rgba(var(--rgb), 0.14);
  min-width: 86px; text-align: center;
}
.pg-peak-node:last-child .pg-peak-badge {
  animation: pgLegendaryAurora 3.8s ease-in-out infinite;
}
.pg-peak-name {
  font-size: 11px; font-weight: 800;
  color: var(--c); letter-spacing: 0.04em;
  margin-top: 2px;
}
.pg-peak-reqs {
  font-size: 9px; color: rgba(13,37,56,0.42);
  white-space: nowrap; line-height: 1.4;
}
.pg-peak-connector {
  width: 1px; height: 14px;
  background: linear-gradient(to bottom, var(--c), transparent);
  opacity: 0.5;
}

/* ── Scene 2 layout ── */
.pg-s2 { grid-template-columns: minmax(280px, 42%) 1fr; align-items: center; }

.pg-s2-left {
  display: flex; flex-direction: column; justify-content: center;
  padding: 0 40px 0 clamp(24px, calc((100vw - 1160px) / 2 + 24px), 180px);
}

.pg-s2-right {
  display: flex; align-items: center; justify-content: center;
  padding: 0 48px;
}

/* ── Shared chapter text ── */
.pg-ch-eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: 0.18em;
  color: rgba(13,37,56,0.35); text-transform: uppercase; margin-bottom: 18px;
}
.pg-ch-heading {
  font-size: clamp(30px, 3.2vw, 50px); font-weight: 800;
  color: #0D2538; line-height: 1.08; letter-spacing: -0.025em; margin: 0 0 20px;
}
.pg-ch-body {
  font-size: clamp(14px, 1.2vw, 16px); color: rgba(13,37,56,0.50);
  line-height: 1.7; margin: 0;
}
.pg-ch-note { font-size: 12px; color: rgba(13,37,56,0.30); line-height: 1.6; margin: 0; }
.pg-criteria {
  display: flex; flex-wrap: wrap; gap: 7px; margin-top: 24px;
}
.pg-criteria-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 13px; border-radius: 100px;
  border: 1px solid rgba(13,37,56,0.12); font-size: 12px; font-weight: 600;
  color: rgba(13,37,56,0.48); background: rgba(255,255,255,0.5);
}

/* ── Cordada ── */
.pg-cordada {
  display: flex; flex-direction: column; gap: 0;
  position: relative; width: 100%; max-width: 400px;
}
.pg-rope-svg {
  position: absolute; left: 27px; top: 54px; bottom: 54px; width: 2px;
  pointer-events: none;
}
.pg-crd-member {
  display: flex; align-items: center; gap: 16px; padding: 16px 0;
  opacity: 0; transform: translateX(-18px);
  transition: opacity 0.55s ease var(--d), transform 0.55s ease var(--d);
  position: relative; z-index: 2;
}
.pg-cordada-on .pg-crd-member { opacity: 1; transform: translateX(0); }
.pg-crd-avatar {
  width: 54px; height: 54px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: #fff;
  flex-shrink: 0;
  transition: box-shadow 0.4s ease, outline 0.4s ease;
}
.pg-crd-info { flex: 1; min-width: 0; }
.pg-crd-name { font-size: 15px; font-weight: 700; color: #0D2538; margin-bottom: 5px; }
.pg-crd-you  { font-size: 12px; font-weight: 600; color: #0EA5E9; }
.pg-crd-stats {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: rgba(13,37,56,0.44);
}
.pg-crd-cairns { display: flex; align-items: center; gap: 3px; }
.pg-crd-ep { font-weight: 600; color: rgba(13,37,56,0.55); }
.pg-crd-rank { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; flex-shrink: 0; }

/* ── Final CTA ── */
.pg-final {
  text-align: center; padding: 88px 24px 112px;
  position: relative; z-index: 2;
}
.pg-final-quote {
  font-size: clamp(20px, 2.8vw, 36px); font-weight: 700; color: #0D2538;
  line-height: 1.35; margin: 0 auto 44px; max-width: 520px;
  border: none; padding: 0; letter-spacing: -0.02em;
}
.pg-final-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 15px 34px; background: #0D2538; border: 1px solid #0D2538;
  border-radius: 100px; color: #fff; font-size: 15px; font-weight: 700;
  letter-spacing: 0.04em; text-decoration: none;
  transition: background 0.3s, box-shadow 0.3s, transform 0.2s;
}
.pg-final-btn:hover {
  background: #1E3A5A; border-color: #1E3A5A;
  box-shadow: 0 8px 28px rgba(13,37,56,0.18);
  transform: translateY(-2px);
}

/* ── Mobile: vertical stack ── */
@media (max-width: 639px) {
  .pg-outer  { height: auto; }
  .pg-sticky { position: static; height: auto; overflow: visible; }
  .pg-track  { flex-direction: column; width: 100%; transform: none !important; }
  .pg-nav    { display: none; }
  .pg-scene  { width: 100%; height: auto; grid-template-columns: 1fr; padding: 64px 0 0; }
  .pg-s1-left, .pg-s2-left { padding: 0 24px 40px; justify-content: flex-start; }
  .pg-s1-right { height: 56vw; min-height: 220px; }
  .pg-s2-right { padding: 0 24px 64px; justify-content: flex-start; }
  .pg-peaks-overlay { display: none; }
  .pg-cordada { max-width: 100%; }
  .pg-crd-member { opacity: 1; transform: none; }
}

/* ── Tablet ── */
@media (min-width: 640px) and (max-width: 899px) {
  .pg-s1 { grid-template-columns: 42% 58%; }
  .pg-s2 { grid-template-columns: 44% 56%; }
  .pg-s1-left, .pg-s2-left { padding-left: clamp(20px, 4vw, 48px); }
  .pg-s2-right { padding: 0 28px; }
}
`;
