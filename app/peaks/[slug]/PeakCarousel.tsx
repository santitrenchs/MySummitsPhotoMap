"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rarityForAlt, slugifyPeak, type PeakCardData } from "@/lib/data/landing-peaks";

const CARD_W = 240;
const CARD_H = 410;

function MountainScene({ color, altM, uid }: { color: string; altM: number; uid: string }) {
  let skyTop: string, skyBot: string, terrainFar: string, terrainNear: string;
  if (altM >= 5000) {
    skyTop = "#04040F"; skyBot = "#141430"; terrainFar = color + "25"; terrainNear = color + "45";
  } else if (altM >= 3000) {
    skyTop = "#0D2248"; skyBot = "#2A5080"; terrainFar = color + "30"; terrainNear = color + "55";
  } else if (altM >= 1000) {
    skyTop = "#1A4B8F"; skyBot = "#5A8FBF"; terrainFar = color + "35"; terrainNear = color + "60";
  } else {
    skyTop = "#3A76BF"; skyBot = "#8AB8D8"; terrainFar = color + "40"; terrainNear = color + "65";
  }
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 240 200" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} /><stop offset="100%" stopColor={skyBot} />
        </linearGradient>
        <linearGradient id={`ov-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" /><stop offset="50%" stopColor="rgba(0,0,0,0)" /><stop offset="100%" stopColor="rgba(0,0,0,0.72)" />
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill={`url(#sky-${uid})`} />
      <path d="M0 155 L40 110 L80 130 L130 90 L175 115 L210 85 L240 105 L240 200 L0 200Z" fill={terrainFar} />
      <path d="M30 200 L120 55 L210 200Z" fill={terrainNear} />
      <path d="M120 55 L104 92 L120 84 L136 92Z" fill="rgba(255,255,255,0.88)" />
      <path d="M120 55 L104 92 L120 84Z" fill="rgba(255,255,255,0.25)" />
      <rect width="240" height="200" fill={`url(#ov-${uid})`} />
    </svg>
  );
}

function CardFace({ card, index, flipped }: { card: PeakCardData; index: number; flipped: boolean }) {
  const rarity = rarityForAlt(card.altitudeM);
  const uid = `pc${index}`;
  const initials = card.user.split(" ").map((w: string) => w[0]).join("");
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
        borderRadius: 18, overflow: "hidden", background: "#FFFFFF",
        border: "1px solid rgba(13,37,56,0.09)", boxShadow: "0 8px 32px rgba(13,37,56,0.14)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: card.userColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff",
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0D2538" }}>{card.user}</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{card.date}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, opacity: 0.3 }}>
            {[0,1,2].map(d => <div key={d} style={{ width: 3, height: 3, borderRadius: "50%", background: "#0D2538" }} />)}
          </div>
        </div>
        <div style={{ flex: 1, position: "relative", overflow: "hidden", margin: "0 10px", borderRadius: 14 }}>
          {card.photo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={card.photo} alt={card.peakName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <MountainScene color={rarity.color} altM={card.altitudeM} uid={uid} />
          }
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 50%, transparent 100%)" }} />
          <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: 3, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
              <a href={`/peaks/${slugifyPeak(card.peakName)}`} style={{ color: "inherit", textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                {card.peakName}
              </a>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>📍 {latStr} · {lngStr}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "10px" }}>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>RAREZA</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: rarity.color, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>✿ {rarity.name}</div>
          </div>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>ALTITUD</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#0D2538", whiteSpace: "nowrap" }}>{card.altLabel}</div>
          </div>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>RECOMPENSA</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap" }}>+{rarity.ep}</div>
          </div>
        </div>
      </div>

      {/* ── Back ── */}
      <div style={{
        position: "absolute", inset: 0,
        backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
        borderRadius: 18, overflow: "hidden", background: "#FFFFFF",
        border: "1px solid rgba(13,37,56,0.09)", boxShadow: "0 8px 32px rgba(13,37,56,0.14)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ position: "relative", height: 238, flexShrink: 0, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.mapImg} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)" }} />
          {/* Flower marker */}
          <div style={{ position: "absolute", top: "38%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", width: 80, height: 80 }}>
            <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: "absolute", inset: 0 }}>
              <circle cx="40" cy="40" r="37" fill="none" stroke={rarity.color} strokeWidth="1" opacity="0.18"/>
              <circle cx="40" cy="40" r="30" fill="none" stroke={rarity.color} strokeWidth="1.1" opacity="0.3"/>
              <circle cx="40" cy="40" r="22" fill="none" stroke={rarity.color} strokeWidth="1.2" opacity="0.48"/>
              <circle cx="40" cy="40" r="14" fill="none" stroke={rarity.color} strokeWidth="1.4" opacity="0.65"/>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: rarity.color, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))", lineHeight: 1 }}>✿</div>
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 14px 12px" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", marginBottom: 5 }}>📍 {latStr} · {lngStr}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.1, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{card.peakName}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.92)", marginTop: 2 }}>{card.altLabel}</div>
            {card.mountainRange && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.50)", marginTop: 2 }}>{card.mountainRange}</div>}
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 4, background: "rgba(255,255,255,0.18)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${barPct}%`, background: `linear-gradient(to right, ${rarity.color}99, ${rarity.color})`, borderRadius: 3 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.40)" }}>0 m</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.40)" }}>8.849 m</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px 0" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: rarity.color }} />
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(13,37,56,0.38)", textTransform: "uppercase" }}>ESTADÍSTICAS</span>
          </div>
          <div style={{ display: "flex", borderTop: "1px solid rgba(13,37,56,0.07)", borderBottom: "1px solid rgba(13,37,56,0.07)", margin: "8px 0 0" }}>
            <div style={{ flex: 1, padding: "10px 14px" }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(13,37,56,0.35)", textTransform: "uppercase", marginBottom: 4 }}>ASCENSIONES</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0D2538", lineHeight: 1 }}>{card.ascents.toLocaleString("es")}</div>
            </div>
            <div style={{ width: 1, background: "rgba(13,37,56,0.07)", margin: "10px 0" }} />
            <div style={{ flex: 1, padding: "10px 14px", textAlign: "right" }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(13,37,56,0.35)", textTransform: "uppercase", marginBottom: 4 }}>ALPINISTAS</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0D2538", lineHeight: 1 }}>{card.climbers.toLocaleString("es")}</div>
            </div>
          </div>
          <div style={{ padding: "9px 14px 14px", flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>{card.user}</p>
            <p style={{ margin: "4px 0 0", fontSize: 10.5, color: "#6B7280", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{card.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PeakCarousel({ peaks }: { peaks: PeakCardData[] }) {
  const total = peaks.length;
  const [active, setActive] = useState(0);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [vw, setVw] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(t); t = setTimeout(() => setVw(window.innerWidth), 150); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(t); };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const dragging = useRef(false);
  const wheelCooldown = useRef(false);

  const prev = useCallback(() => setActive(a => (a - 1 + total) % total), [total]);
  const next = useCallback(() => setActive(a => (a + 1) % total), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") prev(); if (e.key === "ArrowRight") next(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (wheelCooldown.current || Math.abs(e.deltaX) < 5) return;
      wheelCooldown.current = true;
      e.deltaX > 0 ? next() : prev();
      setTimeout(() => { wheelCooldown.current = false; }, 500);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [prev, next]);

  function cardStyle(i: number): React.CSSProperties {
    let dist = i - active;
    if (dist > total / 2) dist -= total;
    if (dist < -total / 2) dist += total;
    const absDist = Math.abs(dist);
    if (absDist > 2) return { display: "none" };
    const step = Math.min(CARD_W * 0.43, vw * 0.20);
    const scale = absDist === 0 ? 1 : absDist === 1 ? 0.84 : 0.71;
    const rotateY = dist === 0 ? 0 : dist > 0 ? Math.min(dist * 24, 55) : Math.max(dist * 24, -55);
    const opacity = absDist === 0 ? 1 : absDist === 1 ? 0.72 : 0.38;
    return {
      position: "absolute", left: "50%", top: "50%",
      width: CARD_W, height: CARD_H,
      transform: `translate(-50%, -50%) translateX(${dist * step}px) scale(${scale}) rotateY(${rotateY}deg)`,
      opacity, zIndex: 10 - absDist, cursor: "pointer",
      transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.45s ease",
      perspective: 1000,
    };
  }

  const handleCardClick = (i: number) => {
    if (dragging.current) return;
    if (i !== active) { setActive(i); return; }
    setFlipped(f => ({ ...f, [i]: !f[i] }));
  };

  return (
    <div>
      {/* Carousel */}
      <div
        ref={containerRef}
        style={{ position: "relative", height: CARD_H, perspective: 1200, overflow: "hidden" }}
        onTouchStart={e => { dragStart.current = e.touches[0].clientX; dragging.current = false; }}
        onTouchMove={e => { if (dragStart.current !== null && Math.abs(e.touches[0].clientX - dragStart.current) > 8) dragging.current = true; }}
        onTouchEnd={e => { if (dragStart.current === null) return; const dx = e.changedTouches[0].clientX - dragStart.current; if (Math.abs(dx) > 40) dx < 0 ? next() : prev(); dragStart.current = null; }}
      >
        {peaks.map((card, i) => (
          <div key={card.peakName} style={cardStyle(i)} onClick={() => handleCardClick(i)}>
            <CardFace card={card} index={i} flipped={!!flipped[i] && i === active} />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 24 }}>
        {peaks.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            width: i === active ? 20 : 7, height: 7,
            borderRadius: 99, border: "none", padding: 0, cursor: "pointer",
            background: i === active ? "#0D2538" : "rgba(13,37,56,0.2)",
            transition: "width 0.3s, background 0.3s",
          }} />
        ))}
      </div>

      {/* Active peak label */}
      <div style={{ textAlign: "center", marginTop: 14, minHeight: 40 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0D2538", letterSpacing: "-0.01em" }}>
          <a href={`/peaks/${slugifyPeak(peaks[active].peakName)}`} style={{ color: "inherit", textDecoration: "none" }}>
            {peaks[active].peakName}
          </a>
        </div>
        <div style={{ fontSize: 12, color: rarityForAlt(peaks[active].altitudeM).color, fontWeight: 600, marginTop: 3 }}>
          ✿ {rarityForAlt(peaks[active].altitudeM).name} · {peaks[active].altLabel}
        </div>
        <p style={{ fontSize: 11, color: "rgba(13,37,56,0.3)", marginTop: 6 }}>Toca para girar</p>
      </div>
    </div>
  );
}
