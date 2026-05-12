"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Data ─────────────────────────────────────────────────────────────────────

const LEVELS = [
  { emoji: "🌱", name: "Scout",     ascents: 20,  altK: 1.5, color: "#22c55e", rgb: "34,197,94"   },
  { emoji: "🥾", name: "Guide",     ascents: 50,  altK: 3.0, color: "#06B6D4", rgb: "6,182,212"   },
  { emoji: "🧭", name: "Explorer",  ascents: 100, altK: 4.5, color: "#A855F7", rgb: "168,85,247"  },
  { emoji: "🏔️", name: "Master",    ascents: 150, altK: 6.0, color: "#F97316", rgb: "249,115,22"  },
  { emoji: "👑", name: "Legendary", ascents: null, altK: null, color: "#F5C842", rgb: "245,200,66" },
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
  { rank: 1, name: "Santi Trenchs", initials: "ST", color: "#0EA5E9", ascents: 52, cairns: 4, ep: 2980, isMe: true  },
  { rank: 2, name: "Jordi Bonati",  initials: "JB", color: "#22c55e", ascents: 37, cairns: 1, ep: 2303, isMe: false },
  { rank: 3, name: "Arnau",         initials: "AR", color: "#A855F7", ascents: 25, cairns: 0, ep: 2150, isMe: false },
];

// ─── Chapter 1: Levels ────────────────────────────────────────────────────────

function ChapterLevels({ active }: { active: boolean }) {
  return (
    <div className="pg-chapter pg-ch1">
      {/* Background topo lines */}
      <svg className="pg-topo" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        {[80,160,250,350,460,580].map((r, i) => (
          <ellipse key={i} cx="400" cy="600" rx={r} ry={r * 0.38}
            fill="none" stroke="rgba(34,197,94,0.10)" strokeWidth="0.8" />
        ))}
      </svg>

      <div className="pg-ch-inner">
        <div className="pg-ch-eyebrow">01 · EL CAMINO DEL MONTAÑERO</div>
        <h3 className="pg-ch-heading">Cada ascensión<br />te define.</h3>
        <p className="pg-ch-body">
          Tu nivel no es un número.<br />Es un reflejo de tu historia en la montaña.
        </p>

        {/* Level path */}
        <div className="pg-levels">
          <div className="pg-levels-line" />
          {LEVELS.map((lvl, i) => (
            <div
              key={lvl.name}
              className={`pg-level${active ? " pg-level-on" : ""}${i === 4 ? " pg-level-legendary" : ""}`}
              style={{ "--c": lvl.color, "--rgb": lvl.rgb, "--d": `${i * 0.13}s` } as React.CSSProperties}
            >
              <div className="pg-level-badge">
                <span>{lvl.emoji}</span>
              </div>
              <div className="pg-level-name">{lvl.name}</div>
              <div className="pg-level-reqs">
                {lvl.ascents != null && <span>{lvl.ascents}+ cimas</span>}
                {lvl.altK  != null && <span>≥{lvl.altK}k m</span>}
                {lvl.ascents == null && <span>Nivel máximo</span>}
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
      <div className="pg-ch2-grid">
        {/* Left copy */}
        <div className="pg-ch-copy">
          <div className="pg-ch-eyebrow">02 · RAREZAS Y PUNTOS</div>
          <h3 className="pg-ch-heading">No todas las<br />ascensiones<br />valen lo mismo.</h3>
          <p className="pg-ch-body">
            La altitud determina la rareza.<br />
            La rareza determina la recompensa.
          </p>
          <p className="pg-ch-note">
            9 niveles de rareza.<br />De 10 EP a 2.000 EP por ascensión.
          </p>
        </div>

        {/* Right: rarity spectrum */}
        <div className="pg-rarities">
          {RARITIES.map((r, i) => (
            <div
              key={r.label}
              className={`pg-rarity-row${active ? " pg-rarity-on" : ""}`}
              style={{
                "--d": `${i * 0.07}s`,
                borderColor: `rgba(${r.rgb},0.22)`,
                boxShadow: active ? `0 0 ${8 + i * 4}px rgba(${r.rgb},0.22)` : "none",
              } as React.CSSProperties}
            >
              <div className="pg-rarity-dot" style={{ background: r.color, boxShadow: `0 0 ${6 + i * 3}px rgba(${r.rgb},0.7)` }} />
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
            <stop offset="0%" stopColor={`hsl(215,${10+n*3}%,${38+n*5}%)`} />
            <stop offset="100%" stopColor={`hsl(215,${8+n*2}%,${28+n*4}%)`} />
          </linearGradient>
        ))}
        <linearGradient id="sg-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5C842" />
          <stop offset="100%" stopColor="#D4A017" />
        </linearGradient>
        <radialGradient id="sg-floor" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(212,160,23,0.35)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {/* Floor glow */}
      <ellipse cx="60" cy="162" rx="50" ry="10" fill="url(#sg-floor)" />
      {/* Stones bottom → top */}
      <ellipse cx="60" cy="148" rx="44" ry="14" fill="url(#sg1)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <ellipse cx="58" cy="126" rx="34" ry="11" fill="url(#sg2)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
      <ellipse cx="61" cy="107" rx="25" ry="9"  fill="url(#sg3)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <ellipse cx="59" cy="91"  rx="18" ry="7"  fill="url(#sg4)" stroke="rgba(255,255,255,0.09)" strokeWidth="0.5" />
      <ellipse cx="60" cy="77"  rx="12" ry="5.5" fill="url(#sg5)" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
      <ellipse cx="61" cy="66"  rx="7.5" ry="4.5" fill="url(#sg6)" stroke="rgba(255,255,255,0.11)" strokeWidth="0.5" />
      {/* Gold cap */}
      <ellipse cx="60" cy="56"  rx="5" ry="3.5"  fill="url(#sg-cap)" stroke="rgba(245,200,66,0.5)" strokeWidth="0.8" />
    </svg>
  );
}

function ChapterCairns({ active }: { active: boolean }) {
  return (
    <div className="pg-chapter pg-ch3">
      <div className={`pg-ch3-inner${active ? " pg-cairns-on" : ""}`}>
        <div className="pg-ch-eyebrow" style={{ textAlign: "center" }}>03 · CAIRNS MYTHIC</div>

        <h3 className="pg-ch-heading pg-ch3-heading">
          Las Mythic<br />dejan huella.
        </h3>

        {/* Cairn visual */}
        <div className="pg-cairn-wrap">
          <div className="pg-cairn-glow" />
          <div className="pg-cairn-float">
            <CairnSVG />
          </div>
          <div className="pg-cairn-badge">+1 Cairn</div>
        </div>

        <p className="pg-ch-body pg-ch3-body">
          Cada cima Mythic conquistada añade un Cairn a tu perfil.
        </p>
        <p className="pg-cairn-note">
          Los Cairns desempatan rankings.<br />
          Pero sobre todo, <em>cuentan historias.</em>
        </p>
      </div>
    </div>
  );
}

// ─── Chapter 4: Ranking ───────────────────────────────────────────────────────

function ChapterRanking({ active }: { active: boolean }) {
  return (
    <div className="pg-chapter pg-ch4">
      <div className="pg-ch4-grid">
        {/* Left copy */}
        <div className="pg-ch-copy">
          <div className="pg-ch-eyebrow">04 · TU CORDADA</div>
          <h3 className="pg-ch-heading">Tu cordada<br />también escala<br />contigo.</h3>
          <p className="pg-ch-body">
            Peakadex no compara desconocidos.<br />
            Solo a quienes comparten montaña contigo.
          </p>
          <div className="pg-criteria">
            <div className="pg-criteria-chip">Ascensiones ↑</div>
            <div className="pg-criteria-chip">Cairns ↑</div>
            <div className="pg-criteria-chip">EP Totales ↑</div>
          </div>
        </div>

        {/* Right: leaderboard */}
        <div className={`pg-leaderboard${active ? " pg-lb-on" : ""}`}>
          {RANKING.map((entry, i) => (
            <div
              key={entry.rank}
              className={`pg-lb-row${entry.isMe ? " pg-lb-me" : ""}`}
              style={{ "--d": `${i * 0.13}s`, "--c": entry.color, "--rgb": entry.color } as React.CSSProperties}
            >
              <div className="pg-lb-rank">#{entry.rank}</div>
              <div className="pg-lb-avatar" style={{ background: entry.color }}>
                {entry.initials}
              </div>
              <div className="pg-lb-info">
                <div className="pg-lb-name">{entry.name}</div>
                <div className="pg-lb-stats">
                  <span>{entry.ascents} cimas</span>
                  <span className="pg-lb-sep">·</span>
                  <span>{entry.cairns} Cairns</span>
                </div>
              </div>
              <div className="pg-lb-ep">+{entry.ep.toLocaleString("es")} <span>EP</span></div>
            </div>
          ))}
          <p className="pg-lb-note">Solo tus amigos aparecen en el ranking.</p>
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

  // Sticky horizontal scroll
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

  // Header reveal
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

        {/* Ambient blobs */}
        <div className="pg-blob pg-blob-1" />
        <div className="pg-blob pg-blob-2" />
        <div className="pg-blob pg-blob-3" />

        {/* ── Section header ── */}
        <div className={`pg-header${headerOn ? " pg-header-on" : ""}`}>
          <div className="pg-header-eyebrow">PROGRESIÓN DE MONTAÑERO</div>
          <h2 className="pg-header-title">De excursionista<br />a leyenda.</h2>
          <p className="pg-header-sub">
            Cada ascensión deja huella.<br />Tu perfil evoluciona montaña a montaña.
          </p>
        </div>

        {/* ── Horizontal scroll zone ── */}
        <div ref={outerRef} className="pg-outer">
          <div className="pg-sticky">

            {/* Chapter nav */}
            <div className="pg-nav">
              {["Niveles", "Rarezas", "Cairns", "Cordada"].map((label, i) => (
                <div key={i} className={`pg-nav-item${activeChapter === i ? " pg-nav-on" : ""}`}>
                  <div className="pg-nav-dot" />
                  <span className="pg-nav-label">{label}</span>
                </div>
              ))}
            </div>

            {/* Track */}
            <div ref={trackRef} className="pg-track">
              <ChapterLevels   active={activeChapter === 0} />
              <ChapterRarities active={activeChapter === 1} />
              <ChapterCairns   active={activeChapter === 2} />
              <ChapterRanking  active={activeChapter === 3} />
            </div>
          </div>
        </div>

        {/* ── Final CTA ── */}
        <div className={`pg-final${headerOn ? " pg-final-on" : ""}`}>
          <blockquote className="pg-final-quote">
            "No coleccionas cimas.<br />Construyes una historia de montaña."
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
  0%,100% { box-shadow: 0 0 18px rgba(245,200,66,0.45), 0 0 36px rgba(245,200,66,0.22); }
  50%      { box-shadow: 0 0 30px rgba(245,200,66,0.7),  0 0 60px rgba(245,200,66,0.38), 0 0 100px rgba(245,200,66,0.15); }
}
@keyframes pgCairnFloat {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-10px); }
}
@keyframes pgGlowPulse {
  0%,100% { opacity: 0.5; transform: scale(1); }
  50%      { opacity: 0.85; transform: scale(1.12); }
}
@keyframes pgParticleRise {
  0%   { opacity: 0;   transform: translateY(0) scale(1); }
  20%  { opacity: 0.8; }
  100% { opacity: 0;   transform: translateY(-60px) scale(0.4); }
}
@keyframes pgFadeUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Section ── */
.pg-section {
  background: #F4F7FA;
  position: relative;
}
.pg-blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.pg-blob-1 {
  top: 0; right: -200px;
  width: 700px; height: 700px;
  background: radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%);
}
.pg-blob-2 {
  top: 30%; left: -180px;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%);
}
.pg-blob-3 {
  bottom: 10%; right: 10%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(245,200,66,0.04) 0%, transparent 70%);
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
  color: rgba(13,37,56,0.4);
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
  color: rgba(13,37,56,0.5);
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
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(13,37,56,0.18);
  transition: background 0.35s, box-shadow 0.35s, transform 0.35s;
}
.pg-nav-on .pg-nav-dot {
  background: rgba(13,37,56,0.75);
  box-shadow: 0 0 8px rgba(13,37,56,0.2);
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
  overflow: hidden;
}
.pg-topo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
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
  color: rgba(13,37,56,0.38);
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
  color: rgba(13,37,56,0.52);
  line-height: 1.7;
  margin: 0;
}
.pg-ch-note {
  font-size: 13px;
  color: rgba(13,37,56,0.32);
  line-height: 1.6;
  margin: 16px 0 0;
}

/* ── Chapter 1: Levels ── */
.pg-ch1 { background: linear-gradient(140deg, #EEF3F9 0%, #F4F7FA 100%); }
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
  top: 31px;
  left: 31px;
  right: 31px;
  height: 1px;
  background: linear-gradient(90deg, #22c55e, #06B6D4 25%, #A855F7 50%, #F97316 75%, #F5C842);
  opacity: 0.22;
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
  width: 62px;
  height: 62px;
  border-radius: 50%;
  border: 2px solid var(--c);
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  margin-bottom: 14px;
  position: relative;
  z-index: 2;
  transition: box-shadow 0.8s ease var(--d);
}
.pg-level-on .pg-level-badge {
  box-shadow: 0 0 14px rgba(var(--rgb),0.4), 0 0 28px rgba(var(--rgb),0.18);
}
.pg-level-legendary .pg-level-badge {
  width: 72px;
  height: 72px;
  font-size: 30px;
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
  color: rgba(13,37,56,0.38);
  text-align: center;
}

/* ── Chapter 2: Rarities ── */
.pg-ch2 { background: linear-gradient(140deg, #F0F4FA 0%, #F4F7FA 100%); }
.pg-ch2-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 72px;
  align-items: center;
  width: 100%;
  max-width: 960px;
}
.pg-rarities {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.pg-rarity-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 7px 14px;
  border-radius: 100px;
  border: 1px solid transparent;
  opacity: 0;
  transform: translateX(20px);
  transition: opacity 0.5s ease var(--d), transform 0.5s ease var(--d), box-shadow 0.5s ease var(--d);
}
.pg-rarity-on { opacity: 1; transform: translateX(0); }
.pg-rarity-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pg-rarity-label {
  font-size: 13px;
  font-weight: 700;
  flex: 1;
  letter-spacing: 0.02em;
}
.pg-rarity-alt {
  font-size: 11px;
  color: rgba(13,37,56,0.35);
  margin-right: 8px;
}
.pg-rarity-ep {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* ── Chapter 3: Cairns ── */
.pg-ch3 { background: linear-gradient(140deg, #F4F7FA 0%, #EEF2F8 100%); }
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
  margin: 36px 0 24px;
}
.pg-cairn-glow {
  position: absolute;
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 140px;
  height: 40px;
  background: radial-gradient(ellipse, rgba(212,160,23,0.4) 0%, transparent 70%);
  filter: blur(8px);
  animation: pgGlowPulse 4s ease-in-out infinite;
}
.pg-cairn-float { animation: pgCairnFloat 4.5s ease-in-out infinite; }
.pg-cairn-badge {
  margin-top: 18px;
  background: linear-gradient(135deg, rgba(212,160,23,0.15), rgba(245,200,66,0.10));
  border: 1px solid rgba(212,160,23,0.4);
  border-radius: 100px;
  padding: 6px 18px;
  font-size: 13px;
  font-weight: 800;
  color: #F5C842;
  letter-spacing: 0.08em;
  box-shadow: 0 0 20px rgba(212,160,23,0.2);
}
.pg-ch3-body { text-align: center; max-width: 380px; }
.pg-cairn-note {
  font-size: 14px;
  color: rgba(13,37,56,0.42);
  line-height: 1.7;
  margin: 14px 0 0;
  text-align: center;
}
.pg-cairn-note em { color: rgba(13,37,56,0.62); font-style: italic; }

/* ── Chapter 4: Ranking ── */
.pg-ch4 { background: linear-gradient(140deg, #EDF2F8 0%, #F4F7FA 100%); }
.pg-ch4-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 72px;
  align-items: center;
  width: 100%;
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
  border: 1px solid rgba(13,37,56,0.14);
  font-size: 12px;
  font-weight: 600;
  color: rgba(13,37,56,0.48);
  letter-spacing: 0.04em;
}
.pg-leaderboard {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pg-lb-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 16px;
  background: #FFFFFF;
  border: 1px solid rgba(13,37,56,0.07);
  opacity: 0;
  transform: translateX(20px);
  transition: opacity 0.6s ease var(--d), transform 0.6s ease var(--d);
}
.pg-lb-on .pg-lb-row { opacity: 1; transform: translateX(0); }
.pg-lb-me {
  background: #EBF5FF;
  border-color: rgba(14,165,233,0.30);
  border-left: 3px solid #0EA5E9;
  box-shadow: 0 2px 12px rgba(14,165,233,0.08);
}
.pg-lb-rank {
  font-size: 12px;
  font-weight: 800;
  color: rgba(13,37,56,0.28);
  width: 28px;
  flex-shrink: 0;
}
.pg-lb-me .pg-lb-rank { color: #0EA5E9; }
.pg-lb-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}
.pg-lb-info { flex: 1; min-width: 0; }
.pg-lb-name {
  font-size: 14px;
  font-weight: 700;
  color: #0D2538;
  margin-bottom: 3px;
}
.pg-lb-stats {
  font-size: 11px;
  color: rgba(13,37,56,0.42);
  display: flex;
  gap: 6px;
}
.pg-lb-sep { opacity: 0.4; }
.pg-lb-ep {
  font-size: 13px;
  font-weight: 800;
  color: rgba(13,37,56,0.55);
  white-space: nowrap;
}
.pg-lb-ep span { font-size: 10px; font-weight: 600; color: rgba(13,37,56,0.32); }
.pg-lb-note {
  font-size: 11px;
  color: rgba(13,37,56,0.25);
  text-align: center;
  margin: 6px 0 0;
  letter-spacing: 0.02em;
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
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-decoration: none;
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.2s;
}
.pg-final-btn:hover {
  background: #1E3A5A;
  border-color: #1E3A5A;
  box-shadow: 0 8px 32px rgba(13,37,56,0.2);
  transform: translateY(-2px);
}

/* ── Mobile: vertical layout, no horizontal scroll ── */
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
  .pg-level-legendary .pg-level-badge { width: 62px; height: 62px; font-size: 26px; }
  .pg-level-reqs { align-items: flex-start; }
  .pg-ch2-grid { grid-template-columns: 1fr; gap: 40px; }
  .pg-ch4-grid { grid-template-columns: 1fr; gap: 40px; }
  .pg-rarity-row { opacity: 1; transform: none; }
  .pg-ch3-inner { opacity: 1; transform: none; }
  .pg-lb-row { opacity: 1; transform: none; }
}

/* ── Tablet: two-column chapters already work, adjust spacing ── */
@media (min-width: 640px) and (max-width: 899px) {
  .pg-levels { max-width: 100%; }
  .pg-level-badge { width: 52px; height: 52px; font-size: 22px; }
  .pg-level-legendary .pg-level-badge { width: 60px; height: 60px; }
  .pg-ch2-grid { gap: 40px; }
  .pg-ch4-grid { gap: 40px; }
}
`;
