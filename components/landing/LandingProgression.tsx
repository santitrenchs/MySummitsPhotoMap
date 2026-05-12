"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Data ─────────────────────────────────────────────────────────────────────

const LEVELS = [
  { name: "Scout",     ascents: 20,  altK: 1.5, color: "#22c55e", rgb: "34,197,94"   },
  { name: "Guide",     ascents: 50,  altK: 3.0, color: "#06B6D4", rgb: "6,182,212"   },
  { name: "Explorer",  ascents: 100, altK: 4.5, color: "#A855F7", rgb: "168,85,247"  },
  { name: "Master",    ascents: 150, altK: 6.0, color: "#F97316", rgb: "249,115,22"  },
  { name: "Legendary", ascents: null, altK: null, color: "#F5C842", rgb: "245,200,66" },
] as const;

const RARITIES = [
  { label: "Daisy",      ep: 10,   color: "#00995C", rgb: "0,153,92",    altM: 0    },
  { label: "Heather",    ep: 20,   color: "#06B6D4", rgb: "6,182,212",   altM: 1000 },
  { label: "Gentian",    ep: 30,   color: "#3B82F6", rgb: "59,130,246",  altM: 2000 },
  { label: "Tundra",     ep: 60,   color: "#0EA5E9", rgb: "14,165,233",  altM: 3000 },
  { label: "Edelweiss",  ep: 120,  color: "#A855F7", rgb: "168,85,247",  altM: 4000 },
  { label: "Draba",      ep: 250,  color: "#EC4899", rgb: "236,72,153",  altM: 5000 },
  { label: "Saxifrage",  ep: 500,  color: "#F97316", rgb: "249,115,22",  altM: 6000 },
  { label: "Cinquefoil", ep: 1000, color: "#EAB308", rgb: "234,179,8",   altM: 7000 },
  { label: "Snow Lotus", ep: 2000, color: "#CBD5E1", rgb: "203,213,225", altM: 8000 },
] as const;

const RANKING = [
  { rank: 1, name: "Oriol Casanovas", initials: "OC", color: "#00995C", ascents: 48, cairns: 3, ep: 2760, isMe: false },
  { rank: 2, name: "Tú",              initials: "TÚ", color: "#0EA5E9", ascents: 38, cairns: 2, ep: 1980, isMe: true  },
  { rank: 3, name: "Marta Ribagorza", initials: "MR", color: "#0E7490", ascents: 31, cairns: 1, ep: 1420, isMe: false },
];

// ─── Monoline level icons ──────────────────────────────────────────────────────

function LevelIcon({ name, color, size = 26 }: { name: string; color: string; size?: number }) {
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
    default:
      return null;
  }
}

// ─── Continuous expedition line (spans 400vw inside pg-track) ─────────────────

function ExpeditionLine() {
  // Coordinate system: 4000 units wide × 120 units tall
  // Path gently ascends left→right (y decreases = visually rises)
  const path = "M 0,100 C 400,94 800,84 1200,70 C 1600,56 2000,44 2400,34 C 2800,24 3200,16 3600,11 L 4000,9";

  return (
    <svg
      style={{ position: "absolute", bottom: "20%", left: 0, width: "100%", height: 130, pointerEvents: "none", zIndex: 1, overflow: "visible" }}
      viewBox="0 0 4000 120"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="expLine" x1="0%" y1="0" x2="100%" y2="0">
          <stop offset="0%"   stopColor="rgba(34,197,94,0.20)"/>
          <stop offset="22%"  stopColor="rgba(6,182,212,0.35)"/>
          <stop offset="48%"  stopColor="rgba(168,85,247,0.40)"/>
          <stop offset="72%"  stopColor="rgba(249,115,22,0.48)"/>
          <stop offset="100%" stopColor="rgba(245,200,66,0.80)"/>
        </linearGradient>
        <linearGradient id="expHalo" x1="0%" y1="0" x2="100%" y2="0">
          <stop offset="0%"   stopColor="rgba(34,197,94,0.08)"/>
          <stop offset="48%"  stopColor="rgba(168,85,247,0.12)"/>
          <stop offset="100%" stopColor="rgba(245,200,66,0.30)"/>
        </linearGradient>
        <filter id="expBlur"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>

      {/* Glow halo */}
      <path d={path} stroke="url(#expHalo)" strokeWidth="10" fill="none" filter="url(#expBlur)"/>
      {/* Main line */}
      <path d={path} stroke="url(#expLine)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>

      {/* Level nodes — spaced through chapter 1 (x 0–1000) */}
      {[
        { x: 120, y: 98, c: "34,197,94",   r: 3 },
        { x: 290, y: 93, c: "6,182,212",   r: 3 },
        { x: 470, y: 87, c: "168,85,247",  r: 3 },
        { x: 660, y: 80, c: "249,115,22",  r: 3 },
        { x: 870, y: 74, c: "245,200,66",  r: 4.5 },
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r + 5} fill={`rgba(${n.c},0.10)`}/>
          <circle cx={n.x} cy={n.y} r={n.r} fill={`rgba(${n.c},0.75)`}/>
        </g>
      ))}

      {/* Chapter transition ticks */}
      {[{ x: 1000, y: 70 }, { x: 2000, y: 44 }, { x: 3000, y: 20 }].map((m, i) => (
        <g key={i}>
          <line x1={m.x} y1={m.y - 14} x2={m.x} y2={m.y + 14}
            stroke="rgba(13,37,56,0.10)" strokeWidth="1" strokeDasharray="2 3"/>
          <circle cx={m.x} cy={m.y} r={2.5} fill="rgba(13,37,56,0.12)"/>
        </g>
      ))}

      {/* Cairn landmark in chapter 3 (x ~2500) */}
      <circle cx={2500} cy={34} r={7}  fill="rgba(245,200,66,0.12)"/>
      <circle cx={2500} cy={34} r={3.5} fill="rgba(245,200,66,0.65)"/>

      {/* Summit dot at end */}
      <circle cx={3850} cy={10} r={8}  fill="rgba(245,200,66,0.15)"/>
      <circle cx={3850} cy={10} r={3.5} fill="rgba(245,200,66,0.90)"/>
    </svg>
  );
}

// ─── Continuous track background ──────────────────────────────────────────────

function TrackBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {/* Warm→cool atmospheric gradient across the full 400vw */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to right, #EBF3F0 0%, #EDF3FA 22%, #EFF0FA 44%, #F3EDF8 66%, #F7EDE0 88%, #FAF2D8 100%)",
      }}/>

      {/* Very subtle topographic contours */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.032 }}
        viewBox="0 0 4000 900" preserveAspectRatio="xMidYMid slice">
        {[130, 270, 410, 560, 700, 840].map((y, i) => (
          <path key={i}
            d={`M 0,${y} C 600,${y - 18 + i * 4} 1200,${y + 14 - i * 3} 1800,${y - 8 + i * 5} C 2400,${y + 18 - i * 2} 3000,${y - 12 + i * 3} 3600,${y + 10 - i * 4} L 4000,${y + 6}`}
            stroke="rgba(13,37,56,1)" strokeWidth="0.9" fill="none"
          />
        ))}
      </svg>

      {/* Per-chapter ambient color wash */}
      <div style={{ position: "absolute", inset: 0, display: "flex", width: "100%", height: "100%" }}>
        <div style={{ flex: "0 0 25%", background: "linear-gradient(to right, rgba(34,197,94,0.05) 0%, rgba(34,197,94,0.02) 100%)" }}/>
        <div style={{ flex: "0 0 25%", background: "linear-gradient(to right, rgba(6,182,212,0.04) 0%, rgba(168,85,247,0.04) 100%)" }}/>
        <div style={{ flex: "0 0 25%", background: "linear-gradient(to right, rgba(212,160,23,0.04) 0%, rgba(245,200,66,0.06) 100%)" }}/>
        <div style={{ flex: "0 0 25%", background: "linear-gradient(to right, rgba(14,165,233,0.04) 0%, rgba(14,165,233,0.02) 100%)" }}/>
      </div>
    </div>
  );
}

// ─── Chapter 1: Levels ────────────────────────────────────────────────────────

function ChapterLevels({ active }: { active: boolean }) {
  return (
    <div className="pg-chapter pg-ch1">
      <div className="pg-ch-inner">
        <div className="pg-ch-eyebrow">01 · EL CAMINO</div>
        <h3 className="pg-ch-heading">Cada ascensión<br />te define.</h3>
        <p className="pg-ch-body">
          Tu nivel refleja tu historia<br />en la montaña.
        </p>

        <div className="pg-levels">
          <div className="pg-levels-line"/>
          {LEVELS.map((lvl, i) => (
            <div
              key={lvl.name}
              className={`pg-level${active ? " pg-level-on" : ""}${i === 4 ? " pg-level-legendary" : ""}`}
              style={{ "--c": lvl.color, "--rgb": lvl.rgb, "--d": `${i * 0.15}s` } as React.CSSProperties}
            >
              <div className="pg-level-badge">
                <LevelIcon name={lvl.name} color={lvl.color} size={i === 4 ? 30 : 24}/>
              </div>
              <div className="pg-level-name">{lvl.name}</div>
              <div className="pg-level-reqs">
                {lvl.ascents !== null
                  ? <span>{lvl.ascents} cimas</span>
                  : <span>sin límite</span>}
                {lvl.altK !== null && <span>≥ {lvl.altK}k m</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Chapter 2: Rarities ──────────────────────────────────────────────────────

function ChapterRarities({ active }: { active: boolean }) {
  return (
    <div className="pg-chapter pg-ch2">
      <div className="pg-ch2-grid pg-ch-inner">
        <div className="pg-ch-copy">
          <div className="pg-ch-eyebrow">02 · RAREZAS & EP</div>
          <h3 className="pg-ch-heading">La altitud<br />define el valor.</h3>
          <p className="pg-ch-body">
            Cada cima tiene una rareza.<br />
            Cuanto más alta, más puntos de expedición.
          </p>
          <p className="pg-ch-note">
            Los EP acumulados determinan tu posición<br />
            cuando las ascensiones empatan.
          </p>
        </div>

        <div className="pg-rarities">
          {RARITIES.map((r, i) => (
            <div
              key={r.label}
              className={`pg-rarity-row${active ? " pg-rarity-on" : ""}`}
              style={{
                "--d": `${i * 0.065}s`,
                borderColor: `rgba(${r.rgb},0.20)`,
                boxShadow: active ? `0 0 ${6 + i * 3}px rgba(${r.rgb},0.16)` : "none",
              } as React.CSSProperties}
            >
              <div className="pg-rarity-dot" style={{ background: r.color }}/>
              <div className="pg-rarity-label" style={{ color: r.color }}>{r.label}</div>
              <div className="pg-rarity-alt">≥{r.altM >= 1000 ? `${r.altM / 1000}k` : r.altM} m</div>
              <div className="pg-rarity-ep" style={{ color: r.color }}>+{r.ep.toLocaleString("es")} EP</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Chapter 3: Cairns ────────────────────────────────────────────────────────

function CairnSVG() {
  return (
    <svg viewBox="0 0 120 170" width="100" height="142" style={{ overflow: "visible" }}>
      <defs>
        {[1,2,3,4,5,6].map(n => (
          <linearGradient key={n} id={`sg${n}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`hsl(220,${12+n*3}%,${62+n*4}%)`}/>
            <stop offset="100%" stopColor={`hsl(220,${10+n*2}%,${52+n*3}%)`}/>
          </linearGradient>
        ))}
        <linearGradient id="sg-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5C842"/>
          <stop offset="100%" stopColor="#D4A017"/>
        </linearGradient>
        <radialGradient id="sg-floor" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(212,160,23,0.25)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="162" rx="50" ry="10" fill="url(#sg-floor)"/>
      <ellipse cx="60" cy="148" rx="44" ry="14" fill="url(#sg1)" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
      <ellipse cx="58" cy="126" rx="34" ry="11" fill="url(#sg2)" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
      <ellipse cx="61" cy="107" rx="25" ry="9"  fill="url(#sg3)" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
      <ellipse cx="59" cy="91"  rx="18" ry="7"  fill="url(#sg4)" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
      <ellipse cx="60" cy="77"  rx="12" ry="5.5" fill="url(#sg5)" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
      <ellipse cx="61" cy="66"  rx="7.5" ry="4.5" fill="url(#sg6)" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
      <ellipse cx="60" cy="56"  rx="5"  ry="3.5"  fill="url(#sg-cap)" stroke="rgba(245,200,66,0.5)" strokeWidth="0.8"/>
    </svg>
  );
}

function ChapterCairns({ active }: { active: boolean }) {
  return (
    <div className="pg-chapter pg-ch3">
      <div className={`pg-ch3-inner${active ? " pg-cairns-on" : ""}`}>
        <div className="pg-ch-eyebrow" style={{ textAlign: "center" }}>03 · CAIRNS MYTHIC</div>
        <h3 className="pg-ch-heading pg-ch3-heading">Las Mythic<br />dejan huella.</h3>

        <div className="pg-cairn-wrap">
          <div className="pg-cairn-glow"/>
          <div className="pg-cairn-float"><CairnSVG/></div>
          <div className="pg-cairn-badge">+1 Cairn</div>
        </div>

        <p className="pg-ch-body pg-ch3-body">
          Cada cima Mythic conquistada añade un Cairn a tu perfil.
        </p>
        <p className="pg-cairn-note">
          Los Cairns desempatan rankings.<br/>
          Pero sobre todo, <em>cuentan historias.</em>
        </p>
      </div>
    </div>
  );
}

// ─── Chapter 4: Ranking (Cordada) ─────────────────────────────────────────────

function ChapterRanking({ active }: { active: boolean }) {
  return (
    <div className="pg-chapter pg-ch4">
      <div className="pg-ch4-grid pg-ch-inner">
        <div className="pg-ch-copy">
          <div className="pg-ch-eyebrow">04 · TU CORDADA</div>
          <h3 className="pg-ch-heading">Tu círculo<br />de cumbre.</h3>
          <p className="pg-ch-body">
            Peakadex no compara desconocidos.<br/>
            Solo a quienes comparten montaña contigo.
          </p>
          <div className="pg-criteria">
            <div className="pg-criteria-chip">Ascensiones</div>
            <div className="pg-criteria-chip">Cairns</div>
            <div className="pg-criteria-chip">EP Totales</div>
          </div>
          <p className="pg-ch-note" style={{ marginTop: 18 }}>
            El ranking se actualiza en tiempo real.
          </p>
        </div>

        {/* Cordada */}
        <div className={`pg-cordada${active ? " pg-cordada-on" : ""}`}>
          {/* Rope line */}
          <svg className="pg-cordada-rope" viewBox="0 0 2 200" preserveAspectRatio="none">
            <line x1="1" y1="0" x2="1" y2="200"
              stroke="rgba(13,37,56,0.10)" strokeWidth="2" strokeDasharray="4 5"/>
          </svg>

          {RANKING.map((entry, i) => (
            <div
              key={entry.rank}
              className={`pg-cordada-member${entry.isMe ? " pg-cordada-me" : ""}`}
              style={{ "--d": `${i * 0.18}s` } as React.CSSProperties}
            >
              <div className="pg-cordada-avatar"
                style={{
                  borderColor: entry.isMe ? entry.color : "transparent",
                  boxShadow: entry.isMe ? `0 0 0 3px rgba(14,165,233,0.15), 0 0 20px rgba(14,165,233,0.18)` : "none",
                }}>
                <div className="pg-cordada-initials" style={{ background: entry.color }}>
                  {entry.initials}
                </div>
              </div>

              <div className="pg-cordada-info">
                <div className="pg-cordada-name">
                  {entry.name}
                  {entry.isMe && <span className="pg-cordada-you"> · tú</span>}
                </div>
                <div className="pg-cordada-stats">
                  <span>{entry.ascents} cimas</span>
                  <span className="pg-lb-sep">·</span>
                  <span>{entry.ep.toLocaleString("es")} EP</span>
                  {entry.cairns > 0 && <>
                    <span className="pg-lb-sep">·</span>
                    <span className="pg-cordada-cairns">{entry.cairns} cairn{entry.cairns !== 1 ? "s" : ""}</span>
                  </>}
                </div>
              </div>

              <div className="pg-cordada-rank"
                style={{ color: i === 0 ? "#D4A017" : "rgba(13,37,56,0.25)" }}>
                #{entry.rank}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LandingProgression() {
  const outerRef   = useRef<HTMLDivElement>(null);
  const trackRef   = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [headerOn, setHeaderOn]           = useState(false);

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
      track.style.transform = `translateX(-${progress * 3 * window.innerWidth}px)`;
      setActiveChapter(Math.min(3, Math.floor(progress * 4)));
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

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setHeaderOn(true); },
      { threshold: 0.05 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <section ref={sectionRef} className="pg-section">

        <div className={`pg-header${headerOn ? " pg-header-on" : ""}`}>
          <div className="pg-header-eyebrow">PROGRESIÓN DE MONTAÑERO</div>
          <h2 className="pg-header-title">De excursionista<br/>a leyenda.</h2>
          <p className="pg-header-sub">
            Cada ascensión deja huella.<br/>Tu perfil evoluciona montaña a montaña.
          </p>
        </div>

        <div ref={outerRef} className="pg-outer">
          <div className="pg-sticky">

            <div className="pg-nav">
              {["Niveles", "Rarezas", "Cairns", "Cordada"].map((label, i) => (
                <div key={i} className={`pg-nav-item${activeChapter === i ? " pg-nav-on" : ""}`}>
                  <div className="pg-nav-dot"/>
                  <span className="pg-nav-label">{label}</span>
                </div>
              ))}
            </div>

            <div ref={trackRef} className="pg-track">
              {/* Persistent layers — sit behind all chapters */}
              <TrackBackground/>
              <ExpeditionLine/>

              <ChapterLevels   active={activeChapter === 0}/>
              <ChapterRarities active={activeChapter === 1}/>
              <ChapterCairns   active={activeChapter === 2}/>
              <ChapterRanking  active={activeChapter === 3}/>
            </div>
          </div>
        </div>

        <div className={`pg-final${headerOn ? " pg-final-on" : ""}`}>
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
  0%,100% { box-shadow: 0 0 16px rgba(245,200,66,0.40), 0 0 32px rgba(245,200,66,0.18); }
  50%     { box-shadow: 0 0 28px rgba(245,200,66,0.65), 0 0 56px rgba(245,200,66,0.32), 0 0 90px rgba(245,200,66,0.12); }
}
@keyframes pgCairnFloat {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-9px); }
}
@keyframes pgGlowPulse {
  0%,100% { opacity: 0.4; transform: translateX(-50%) scale(1); }
  50%     { opacity: 0.75; transform: translateX(-50%) scale(1.14); }
}
@keyframes pgFadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Section ── */
.pg-section {
  background: #F4F7FA;
  position: relative;
}

/* ── Header ── */
.pg-header {
  text-align: center;
  padding: 110px 24px 72px;
  position: relative;
  z-index: 2;
}
.pg-header-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: rgba(13,37,56,0.35);
  display: inline-block;
  margin-bottom: 28px;
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.pg-header-on .pg-header-eyebrow { opacity: 1; transform: translateY(0); }
.pg-header-title {
  font-size: clamp(46px, 6.5vw, 84px);
  font-weight: 800;
  color: #0D2538;
  line-height: 1.0;
  letter-spacing: -0.03em;
  margin: 0 0 28px;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.8s ease 0.12s, transform 0.8s ease 0.12s;
}
.pg-header-on .pg-header-title { opacity: 1; transform: translateY(0); }
.pg-header-sub {
  font-size: clamp(16px, 1.8vw, 20px);
  color: rgba(13,37,56,0.48);
  line-height: 1.65;
  margin: 0;
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 0.8s ease 0.24s, transform 0.8s ease 0.24s;
}
.pg-header-on .pg-header-sub { opacity: 1; transform: translateY(0); }

/* ── Scroll zone ── */
.pg-outer { height: 400vh; position: relative; }
.pg-sticky {
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: hidden;
}
.pg-track {
  display: flex;
  width: 400vw;
  height: 100%;
  will-change: transform;
  position: relative;
}

/* ── Chapter nav ── */
.pg-nav {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 28px;
  z-index: 20;
}
.pg-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.pg-nav-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: rgba(13,37,56,0.18);
  transition: background 0.35s, box-shadow 0.35s, transform 0.35s;
}
.pg-nav-on .pg-nav-dot {
  background: rgba(13,37,56,0.70);
  box-shadow: 0 0 8px rgba(13,37,56,0.18);
  transform: scale(1.3);
}
.pg-nav-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.10em;
  color: rgba(13,37,56,0.22);
  text-transform: uppercase;
  transition: color 0.35s;
}
.pg-nav-on .pg-nav-label { color: rgba(13,37,56,0.55); }

/* ── Chapter base ── */
.pg-chapter {
  width: 100vw;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 max(40px, 8vw);
  position: relative;
  background: transparent;
  overflow: hidden;
}
.pg-ch-inner {
  position: relative;
  z-index: 2;
  width: 100%;
}
.pg-ch-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: rgba(13,37,56,0.35);
  text-transform: uppercase;
  margin-bottom: 18px;
}
.pg-ch-heading {
  font-size: clamp(32px, 3.8vw, 56px);
  font-weight: 800;
  color: #0D2538;
  line-height: 1.08;
  letter-spacing: -0.025em;
  margin: 0 0 22px;
}
.pg-ch-body {
  font-size: clamp(14px, 1.3vw, 17px);
  color: rgba(13,37,56,0.50);
  line-height: 1.7;
  margin: 0;
}
.pg-ch-note {
  font-size: 13px;
  color: rgba(13,37,56,0.30);
  line-height: 1.6;
  margin: 16px 0 0;
}
.pg-ch-copy { /* left column in 2-col chapters */ }

/* ── Chapter 1: Levels ── */
.pg-levels {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
  margin-top: 52px;
  max-width: 900px;
}
.pg-levels-line {
  position: absolute;
  top: 30px;
  left: 31px; right: 31px;
  height: 1px;
  background: linear-gradient(90deg, rgba(34,197,94,0.35), rgba(6,182,212,0.35) 25%, rgba(168,85,247,0.35) 50%, rgba(249,115,22,0.35) 75%, rgba(245,200,66,0.55));
  opacity: 0.6;
}
.pg-level {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.65s ease var(--d), transform 0.65s ease var(--d);
}
.pg-level-on { opacity: 1; transform: translateY(0); }
.pg-level-badge {
  width: 62px; height: 62px;
  border-radius: 50%;
  border: 2px solid var(--c);
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  position: relative;
  z-index: 2;
  transition: box-shadow 0.8s ease var(--d);
}
.pg-level-on .pg-level-badge {
  box-shadow: 0 0 12px rgba(var(--rgb),0.30), 0 0 24px rgba(var(--rgb),0.12);
}
.pg-level-legendary .pg-level-badge {
  width: 72px; height: 72px;
  margin-bottom: 16px;
}
.pg-level-legendary.pg-level-on .pg-level-badge {
  animation: pgLegendaryAurora 3.5s ease-in-out infinite;
}
.pg-level-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--c);
  margin-bottom: 6px;
  text-align: center;
  letter-spacing: 0.03em;
}
.pg-level-reqs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.pg-level-reqs span {
  font-size: 10px;
  color: rgba(13,37,56,0.35);
  text-align: center;
}

/* ── Chapter 2: Rarities ── */
.pg-ch2-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 72px;
  align-items: center;
  max-width: 960px;
}
.pg-rarities {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pg-rarity-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 7px 14px;
  border-radius: 100px;
  border: 1px solid transparent;
  background: rgba(255,255,255,0.55);
  opacity: 0;
  transform: translateX(20px);
  transition: opacity 0.5s ease var(--d), transform 0.5s ease var(--d), box-shadow 0.5s ease var(--d);
}
.pg-rarity-on { opacity: 1; transform: translateX(0); }
.pg-rarity-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pg-rarity-label {
  font-size: 13px; font-weight: 700;
  flex: 1;
  letter-spacing: 0.02em;
}
.pg-rarity-alt {
  font-size: 11px;
  color: rgba(13,37,56,0.32);
  margin-right: 8px;
}
.pg-rarity-ep {
  font-size: 12px; font-weight: 800;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* ── Chapter 3: Cairns ── */
.pg-ch3-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.9s ease, transform 0.9s ease;
}
.pg-cairns-on { opacity: 1; transform: translateY(0); }
.pg-ch3-heading { text-align: center; }
.pg-cairn-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 32px 0 20px;
}
.pg-cairn-glow {
  position: absolute;
  bottom: -12px;
  left: 50%;
  width: 140px; height: 36px;
  background: radial-gradient(ellipse, rgba(212,160,23,0.30) 0%, transparent 70%);
  filter: blur(8px);
  animation: pgGlowPulse 4s ease-in-out infinite;
}
.pg-cairn-float { animation: pgCairnFloat 4.5s ease-in-out infinite; }
.pg-cairn-badge {
  margin-top: 16px;
  background: linear-gradient(135deg, rgba(212,160,23,0.12), rgba(245,200,66,0.08));
  border: 1px solid rgba(212,160,23,0.35);
  border-radius: 100px;
  padding: 6px 18px;
  font-size: 13px; font-weight: 800;
  color: #B8820E;
  letter-spacing: 0.08em;
  box-shadow: 0 0 16px rgba(212,160,23,0.15);
}
.pg-ch3-body { text-align: center; max-width: 380px; }
.pg-cairn-note {
  font-size: 14px;
  color: rgba(13,37,56,0.38);
  line-height: 1.7;
  margin: 14px 0 0;
  text-align: center;
}
.pg-cairn-note em { color: rgba(13,37,56,0.58); font-style: italic; }

/* ── Chapter 4: Cordada ── */
.pg-ch4-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 72px;
  align-items: center;
  max-width: 960px;
}
.pg-criteria {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
}
.pg-criteria-chip {
  padding: 6px 14px;
  border-radius: 100px;
  border: 1px solid rgba(13,37,56,0.13);
  font-size: 12px; font-weight: 600;
  color: rgba(13,37,56,0.45);
  letter-spacing: 0.04em;
  background: rgba(255,255,255,0.5);
}
.pg-cordada {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  max-width: 400px;
}
.pg-cordada-rope {
  position: absolute;
  left: 27px;
  top: 52px;
  width: 2px;
  bottom: 52px;
  pointer-events: none;
}
.pg-cordada-member {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  opacity: 0;
  transform: translateX(-20px);
  transition: opacity 0.6s ease var(--d), transform 0.6s ease var(--d);
  position: relative;
  z-index: 2;
}
.pg-cordada-on .pg-cordada-member { opacity: 1; transform: translateX(0); }
.pg-cordada-avatar {
  width: 54px; height: 54px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: box-shadow 0.4s ease;
}
.pg-cordada-initials {
  width: 46px; height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px; font-weight: 800;
  color: #fff;
}
.pg-cordada-info { flex: 1; min-width: 0; }
.pg-cordada-name {
  font-size: 15px; font-weight: 700;
  color: #0D2538;
  margin-bottom: 4px;
}
.pg-cordada-you {
  font-size: 12px; font-weight: 600;
  color: #0EA5E9;
}
.pg-cordada-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(13,37,56,0.42);
}
.pg-lb-sep { opacity: 0.4; }
.pg-cordada-cairns { color: #B8820E; font-weight: 600; }
.pg-cordada-rank {
  font-size: 18px; font-weight: 800;
  letter-spacing: -0.02em;
  flex-shrink: 0;
}

/* ── Final CTA ── */
.pg-final {
  text-align: center;
  padding: 96px 24px 120px;
  position: relative;
  z-index: 2;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.9s ease 0.1s, transform 0.9s ease 0.1s;
}
.pg-final-on { opacity: 1; transform: translateY(0); }
.pg-final-quote {
  font-size: clamp(22px, 3vw, 38px);
  font-weight: 700;
  color: #0D2538;
  line-height: 1.35;
  margin: 0 auto 48px;
  max-width: 560px;
  border: none;
  padding: 0;
  letter-spacing: -0.02em;
}
.pg-final-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 36px;
  background: #0D2538;
  border: 1px solid #0D2538;
  border-radius: 100px;
  color: #FFFFFF;
  font-size: 15px; font-weight: 700;
  letter-spacing: 0.04em;
  text-decoration: none;
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.2s;
}
.pg-final-btn:hover {
  background: #1E3A5A;
  border-color: #1E3A5A;
  box-shadow: 0 8px 32px rgba(13,37,56,0.18);
  transform: translateY(-2px);
}

/* ── Mobile: vertical stack, no horizontal scroll ── */
@media (max-width: 639px) {
  .pg-outer { height: auto; }
  .pg-sticky { position: static; height: auto; overflow: visible; }
  .pg-track { flex-direction: column; width: 100%; transform: none !important; }
  .pg-chapter { width: 100%; height: auto; padding: 72px 24px; }
  .pg-nav { display: none; }
  .pg-ch-inner { width: 100%; }
  .pg-levels { flex-direction: column; gap: 32px; max-width: 100%; margin-top: 36px; }
  .pg-levels-line { display: none; }
  .pg-level { flex-direction: row; align-items: center; gap: 16px; opacity: 1; transform: none; }
  .pg-level-badge { margin-bottom: 0; }
  .pg-level-legendary .pg-level-badge { width: 62px; height: 62px; }
  .pg-level-reqs { align-items: flex-start; }
  .pg-ch2-grid { grid-template-columns: 1fr; gap: 36px; }
  .pg-ch4-grid { grid-template-columns: 1fr; gap: 36px; }
  .pg-rarity-row { opacity: 1; transform: none; }
  .pg-ch3-inner { opacity: 1; transform: none; }
  .pg-cordada-member { opacity: 1; transform: none; }
}

/* ── Tablet ── */
@media (min-width: 640px) and (max-width: 899px) {
  .pg-levels { max-width: 100%; }
  .pg-level-badge { width: 52px; height: 52px; }
  .pg-level-legendary .pg-level-badge { width: 60px; height: 60px; }
  .pg-ch2-grid { gap: 40px; }
  .pg-ch4-grid { gap: 40px; }
}
`;
