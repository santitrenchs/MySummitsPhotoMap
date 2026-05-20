"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLandingT } from "./LandingLocaleContext";
import { LANDING_PEAKS, rarityForAlt, slugifyPeak, type PeakCardData } from "@/lib/data/landing-peaks";

// ─── Local alias for brevity ──────────────────────────────────────────────────
type CardData = PeakCardData;
const RAW: CardData[] = LANDING_PEAKS;

// ─── Mountain scene (photo placeholder) ──────────────────────────────────────
function MountainScene({ color, altM, uid }: { color: string; altM: number; uid: string }) {
  let skyTop: string, skyBot: string, terrainFar: string, terrainNear: string;
  if (altM >= 5000) {
    skyTop = "#04040F"; skyBot = "#141430";
    terrainFar = color + "25"; terrainNear = color + "45";
  } else if (altM >= 3000) {
    skyTop = "#0D2248"; skyBot = "#2A5080";
    terrainFar = color + "30"; terrainNear = color + "55";
  } else if (altM >= 1000) {
    skyTop = "#1A4B8F"; skyBot = "#5A8FBF";
    terrainFar = color + "35"; terrainNear = color + "60";
  } else {
    skyTop = "#3A76BF"; skyBot = "#8AB8D8";
    terrainFar = color + "40"; terrainNear = color + "65";
  }

  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      viewBox="0 0 240 200"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBot} />
        </linearGradient>
        <linearGradient id={`ov-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
          <stop offset="50%"  stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.72)" />
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill={`url(#sky-${uid})`} />
      <path d="M0 155 L40 110 L80 130 L130 90 L175 115 L210 85 L240 105 L240 200 L0 200Z"
        fill={terrainFar} />
      <path d="M30 200 L120 55 L210 200Z" fill={terrainNear} />
      <path d="M120 55 L104 92 L120 84 L136 92Z" fill="rgba(255,255,255,0.88)" />
      <path d="M120 55 L104 92 L120 84Z" fill="rgba(255,255,255,0.25)" />
      <rect width="240" height="200" fill={`url(#ov-${uid})`} />
    </svg>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CardFace({ card, index, flipped, isNearby }: { card: CardData; index: number; flipped: boolean; isNearby: boolean }) {
  const t = useLandingT();
  const registerHref = t.locale === "es" ? "/register" : `/${t.locale}/register`;
  const { name: rarity, color, ep } = rarityForAlt(card.altitudeM);
  const uid = `c${index}`;

  const latStr = `${Math.abs(card.lat).toFixed(4)}°${card.lat >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(card.lng).toFixed(4)}°${card.lng >= 0 ? "E" : "W"}`;
  const barPct = Math.min(100, (card.altitudeM / 8849) * 100).toFixed(1);

  return (
    <div style={{
      width: "100%", height: "100%",
      transformStyle: "preserve-3d",
      transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
      transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
    }}>

      {/* ── Front ── */}
      <div style={{
        position: "absolute", inset: 0,
        backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
        borderRadius: 18, overflow: "hidden",
        background: "#FFFFFF",
        border: "1px solid rgba(13,37,56,0.09)",
        boxShadow: "0 8px 32px rgba(13,37,56,0.14)",
        display: "flex", flexDirection: "column",
      }}>

        {/* User header */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: card.userColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff",
          }}>
            {card.user.split(" ").map(w => w[0]).join("")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0D2538" }}>{card.user}</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{card.date}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, opacity: 0.3 }}>
            {[0,1,2].map(d => (
              <div key={d} style={{ width: 3, height: 3, borderRadius: "50%", background: "#0D2538" }} />
            ))}
          </div>
        </div>

        {/* Photo area — flex:1 fills remaining space */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", margin: "0 10px", borderRadius: 14 }}>
          {card.photo && isNearby
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={card.photo} alt={card.peakName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <MountainScene color={color} altM={card.altitudeM} uid={uid} />
          }
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 50%, transparent 100%)" }} />
          {/* Peak overlay */}
          <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: 3, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
              <a
                href={`/peaks/${slugifyPeak(card.peakName)}`}
                title={`Página de ${card.peakName}`}
                style={{ color: "inherit", textDecoration: "none" }}
                onClick={(e) => e.stopPropagation()}
              >
                {card.peakName}
              </a>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
              📍 {latStr} · {lngStr}
            </div>
          </div>
        </div>

        {/* Stat band — RAREZA · ALTITUD · RECOMPENSA */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "10px" }}>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>{t.cards_rarity}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, lineHeight: 1.2 }}>
              ✿ <span style={{ fontSize: 10 }}>{rarity}</span>
            </div>
          </div>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>{t.cards_altitude}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#0D2538", whiteSpace: "nowrap" }}>{card.altLabel}</div>
          </div>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>{t.cards_reward}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap" }}>+{ep}</div>
          </div>
        </div>

      </div>

      {/* ── Back ── */}
      <div style={{
        position: "absolute", inset: 0,
        backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
        borderRadius: 18, overflow: "hidden",
        background: "#FFFFFF",
        border: "1px solid rgba(13,37,56,0.09)",
        boxShadow: "0 8px 32px rgba(13,37,56,0.14)",
        display: "flex", flexDirection: "column",
      }}>

        {/* Map — covers full top portion (~58% of card height) */}
        <div style={{ position: "relative", height: 238, flexShrink: 0, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.mapImg}
            alt=""
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {/* Gradient */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)",
          }} />
          {/* Overlay: coords + name + alt + range + bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 14px 12px" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", marginBottom: 5, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ color: "#ef4444", fontSize: 10 }}>📍</span>
              {latStr} · {lngStr}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.1, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
              {card.peakName}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.92)", marginTop: 2 }}>
              {card.altLabel}
            </div>
            {card.mountainRange && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.50)", marginTop: 2 }}>{card.mountainRange}</div>
            )}
            {/* Altitude bar */}
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 4, background: "rgba(255,255,255,0.18)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${barPct}%`, background: `linear-gradient(to right, ${color}99, ${color})`, borderRadius: 3 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.40)" }}>0 m</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.40)" }}>8.849 m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px 0" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(13,37,56,0.38)", textTransform: "uppercase" }}>
              {t.cards_stats_label}
            </span>
          </div>
          {/* KPIs */}
          <div style={{ display: "flex", borderTop: "1px solid rgba(13,37,56,0.07)", borderBottom: "1px solid rgba(13,37,56,0.07)", margin: "8px 0 0" }}>
            <div style={{ flex: 1, padding: "10px 14px" }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(13,37,56,0.35)", textTransform: "uppercase", marginBottom: 4 }}>{t.cards_ascents}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0D2538", lineHeight: 1 }}>{card.ascents.toLocaleString(t.numberLocale)}</div>
            </div>
            <div style={{ width: 1, background: "rgba(13,37,56,0.07)", margin: "10px 0" }} />
            <div style={{ flex: 1, padding: "10px 14px", textAlign: "right" }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(13,37,56,0.35)", textTransform: "uppercase", marginBottom: 4 }}>{t.cards_climbers}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0D2538", lineHeight: 1 }}>{card.climbers.toLocaleString(t.numberLocale)}</div>
            </div>
          </div>
          {/* User + message */}
          <div style={{ padding: "9px 14px 14px", flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
              {card.user}
            </p>
            <p style={{
              margin: "4px 0 0", fontSize: 10.5, color: "#6B7280", lineHeight: 1.55,
              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {card.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Coverflow carousel ───────────────────────────────────────────────────────
const CARD_W = 240;
const CARD_H = 410;

export default function LandingCards() {
  const t = useLandingT();
  const registerHref = t.locale === "es" ? "/register" : `/${t.locale}/register`;
  const [active, setActive] = useState(0);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [vw, setVw] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);
  const total = RAW.length;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setVw(window.innerWidth), 150);
    };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(timer); };
  }, []);

  const dragStart   = useRef<number | null>(null);
  const dragging    = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelCooldown = useRef(false);

  const prev = useCallback(() => setActive((a) => (a - 1 + total) % total), [total]);
  const next = useCallback(() => setActive((a) => (a + 1) % total), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (wheelCooldown.current) return;
      if (Math.abs(e.deltaX) < 5) return;
      wheelCooldown.current = true;
      e.deltaX > 0 ? next() : prev();
      setTimeout(() => { wheelCooldown.current = false; }, 500);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [prev, next]);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientX;
    dragging.current  = false;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    if (Math.abs(e.touches[0].clientX - dragStart.current) > 8) dragging.current = true;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    const dx = e.changedTouches[0].clientX - dragStart.current;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    dragStart.current = null;
  };

  const handleCardClick = (i: number) => {
    if (dragging.current) return;
    if (i !== active) { setActive(i); return; }
    setFlipped((f) => ({ ...f, [i]: !f[i] }));
  };

  function cardStyle(i: number): React.CSSProperties {
    let dist = i - active;
    if (dist > total / 2)  dist -= total;
    if (dist < -total / 2) dist += total;
    const absDist = Math.abs(dist);
    if (absDist > 2) return { display: "none" };

    const step = Math.min(CARD_W * 0.43, vw * 0.20);
    const translateX = dist * step;
    const scale      = absDist === 0 ? 1 : absDist === 1 ? 0.84 : absDist === 2 ? 0.71 : 0.60;
    const rotateY    = dist === 0 ? 0 : dist > 0 ? Math.min(dist * 24, 55) : Math.max(dist * 24, -55);
    const opacity    = absDist === 0 ? 1 : absDist === 1 ? 0.72 : 0.38;
    const zIndex     = 10 - absDist;

    return {
      position: "absolute", left: "50%", top: "50%",
      width: CARD_W, height: CARD_H,
      transform: `translate(-50%, -50%) translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg)`,
      opacity, zIndex, cursor: "pointer",
      transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.45s ease",
      perspective: 1000,
    };
  }

  return (
    <section id="cartas" className="ld-section" style={{ background: "#F4F7FA" }}>
      <div className="ld-container">
        <div className="lc-split">

          {/* ── Left column: text + CTA ── */}
          <div className="lc-left">
            <div className="ld-section-label">{t.cards_section_label}</div>
            <h2 className="ld-display ld-section-title" style={{ marginTop: 12 }}>
              {t.cards_title1}<br />{t.cards_title2}
              <br />
              <span style={{ color: "var(--ld-gold)" }}>{t.cards_title3}<br />{t.cards_title4}</span>
            </h2>
            <p className="ld-section-sub" style={{ marginTop: 20 }}>
              {t.cards_body}
            </p>
            <p style={{ fontSize: 13, color: "rgba(13,37,56,0.4)", marginTop: 20, marginBottom: 28 }}>
              {t.cards_footer}
            </p>
            <a href={registerHref} className="ld-btn-primary" style={{ display: "inline-flex" }}>
              {t.cards_cta}
            </a>
          </div>

          {/* ── Right column: carousel ── */}
          <div className="lc-right">
            <div
              ref={containerRef}
              style={{ position: "relative", height: CARD_H, perspective: 1200, overflow: "hidden" }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {RAW.map((card, i) => {
                let dist = i - active;
                if (dist > total / 2)  dist -= total;
                if (dist < -total / 2) dist += total;
                const absDist = Math.abs(dist);
                return (
                  <div key={card.peakName} style={cardStyle(i)} onClick={() => handleCardClick(i)}>
                    <CardFace card={card} index={i} flipped={!!flipped[i] && i === active} isNearby={absDist <= 2} />
                  </div>
                );
              })}
            </div>

            {/* Dot indicators */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 28 }}>
              {RAW.map((_, i) => (
                <button key={i} onClick={() => setActive(i)} aria-label={`${t.cards_section_label} ${i + 1}`} style={{
                  width: i === active ? 20 : 7, height: 7,
                  borderRadius: 99, border: "none", padding: 0, cursor: "pointer",
                  background: i === active ? "#0D2538" : "rgba(13,37,56,0.2)",
                  transition: "width 0.3s, background 0.3s",
                }} />
              ))}
            </div>

            {/* Peak name + rarity */}
            <div style={{ textAlign: "center", marginTop: 16, minHeight: 44 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#0D2538",
                fontFamily: "var(--font-space, sans-serif)", letterSpacing: "-0.01em" }}>
                {RAW[active].peakName}
              </div>
              <div style={{ fontSize: 12, color: rarityForAlt(RAW[active].altitudeM).color, fontWeight: 600, marginTop: 3 }}>
                ✿ {rarityForAlt(RAW[active].altitudeM).name} · {RAW[active].altLabel}
              </div>
              <p style={{ fontSize: 11, color: "rgba(13,37,56,0.3)", marginTop: 6 }}>
                {t.cards_flip}
              </p>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .lc-split {
          display: flex;
          flex-direction: column;
          gap: 48px;
        }
        .lc-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .lc-right {
          width: 100%;
        }
        @media (min-width: 900px) {
          .lc-split {
            flex-direction: row;
            align-items: center;
            gap: 64px;
          }
          .lc-left {
            flex: 0 0 340px;
            max-width: 340px;
          }
          .lc-right {
            flex: 1;
            min-width: 0;
          }
          .lc-left .ld-section-title {
            font-size: 40px !important;
          }
        }
        @media (min-width: 640px) and (max-width: 899px) {
          .lc-left { align-items: center; text-align: center; }
        }
        @media (max-width: 639px) {
          .lc-left { align-items: center; text-align: center; }
          .lc-left .ld-section-title { font-size: 30px !important; }
        }
      `}</style>
    </section>
  );
}
