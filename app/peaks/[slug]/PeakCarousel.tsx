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

function CardFront({ card, index }: { card: PeakCardData; index: number }) {
  const rarity = rarityForAlt(card.altitudeM);
  const uid = `pc${index}`;
  const initials = card.user.split(" ").map((w: string) => w[0]).join("");
  const latStr = `${Math.abs(card.lat).toFixed(4)}°${card.lat >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(card.lng).toFixed(4)}°${card.lng >= 0 ? "E" : "W"}`;

  return (
    <div style={{
      width: "100%", height: "100%",
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
            {card.peakName}
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
  );
}

export function PeakCarousel({ peaks }: { peaks: PeakCardData[] }) {
  const total = peaks.length;
  const [active, setActive] = useState(0);
  const [vw, setVw] = useState(1200);

  useEffect(() => {
    setVw(window.innerWidth);
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
    const maxVisible = vw >= 640 ? 4 : 2;
    if (absDist > maxVisible) return { display: "none" };
    // Desktop: tighter step so 4 side cards fit; mobile: narrower
    const step = vw >= 640 ? vw * 0.14 : Math.min(CARD_W * 0.43, vw * 0.35);
    const scaleMap = [1, 0.84, 0.71, 0.60, 0.50];
    const opacityMap = [1, 0.72, 0.50, 0.30, 0.16];
    const scale = scaleMap[absDist] ?? 0.50;
    const rotateY = dist === 0 ? 0 : dist > 0 ? Math.min(dist * 20, 55) : Math.max(dist * 20, -55);
    const opacity = opacityMap[absDist] ?? 0.16;
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
    window.location.href = `/peaks/${slugifyPeak(peaks[i].peakName)}`;
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
            <CardFront card={card} index={i} />
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
      <div style={{ textAlign: "center", marginTop: 14, minHeight: 36 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0D2538", letterSpacing: "-0.01em" }}>
          {peaks[active].peakName}
        </div>
        <div style={{ fontSize: 12, color: rarityForAlt(peaks[active].altitudeM).color, fontWeight: 600, marginTop: 3 }}>
          ✿ {rarityForAlt(peaks[active].altitudeM).name} · {peaks[active].altLabel}
        </div>
      </div>
    </div>
  );
}
