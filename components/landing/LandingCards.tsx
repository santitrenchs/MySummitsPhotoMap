"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Rarity helpers ──────────────────────────────────────────────────────────
function rarityForAlt(m: number): { name: string; color: string; ep: string } {
  if (m >= 8000) return { name: "Snow Lotus",  color: "#94A3B8", ep: "2.000 EP" };
  if (m >= 7000) return { name: "Cinquefoil",  color: "#EAB308", ep: "1.000 EP" };
  if (m >= 6000) return { name: "Saxifrage",   color: "#F97316", ep: "500 EP"   };
  if (m >= 5000) return { name: "Draba",       color: "#EC4899", ep: "250 EP"   };
  if (m >= 4000) return { name: "Edelweiss",   color: "#A855F7", ep: "120 EP"   };
  if (m >= 3000) return { name: "Tundra",      color: "#0E7490", ep: "60 EP"    };
  if (m >= 2000) return { name: "Gentian",     color: "#1E40AF", ep: "30 EP"    };
  if (m >= 1000) return { name: "Heather",     color: "#06B6D4", ep: "20 EP"    };
  return          { name: "Daisy",        color: "#00995C", ep: "10 EP"    };
}

// ─── Card data ────────────────────────────────────────────────────────────────
type CardData = {
  peakName: string; altitudeM: number; altLabel: string;
  country: string; flag: string; mountainRange: string;
  route: string; date: string;
  user: string; userColor: string;
};

const RAW: CardData[] = [
  { peakName: "Aneto",               altitudeM: 3404, altLabel: "3.404 m", flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",        route: "Vía del Portillón",           date: "14 ago 2024", user: "Marc Puig",      userColor: "#1E40AF" },
  { peakName: "Monte Perdido",       altitudeM: 3355, altLabel: "3.355 m", flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",        route: "Vía del Cilindro",            date: "02 sep 2023", user: "Laia Font",      userColor: "#A855F7" },
  { peakName: "Posets",              altitudeM: 3375, altLabel: "3.375 m", flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",        route: "Arista NO",                   date: "27 jul 2024", user: "Jordi Mas",      userColor: "#0E7490" },
  { peakName: "Pica d'Estats",       altitudeM: 3143, altLabel: "3.143 m", flag: "🇦🇩", country: "Andorra",       mountainRange: "Pirineos",        route: "Vía normal SO",               date: "11 ago 2023", user: "Núria Bosch",    userColor: "#00995C" },
  { peakName: "Mont Blanc",          altitudeM: 4808, altLabel: "4.808 m", flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes",           route: "Vía Goûter",                  date: "22 jul 2023", user: "Alex Roca",      userColor: "#EC4899" },
  { peakName: "Barre des Écrins",    altitudeM: 4102, altLabel: "4.102 m", flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes Dauphinois", route: "Arista O",                   date: "18 jul 2024", user: "Marc Puig",      userColor: "#1E40AF" },
  { peakName: "La Meije",            altitudeM: 3983, altLabel: "3.983 m", flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes Dauphinois", route: "Gran Couloir",               date: "05 ago 2022", user: "Carla Vidal",    userColor: "#F97316" },
  { peakName: "Mont Aiguille",       altitudeM: 2087, altLabel: "2.087 m", flag: "🇫🇷", country: "Francia",       mountainRange: "Vercors",         route: "Vía normal S",                date: "30 may 2024", user: "Laia Font",      userColor: "#A855F7" },
  { peakName: "Dufourspitze",        altitudeM: 4634, altLabel: "4.634 m", flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Peninos",   route: "Arista NE",                   date: "14 ago 2023", user: "Jordi Mas",      userColor: "#0E7490" },
  { peakName: "Matterhorn",          altitudeM: 4478, altLabel: "4.478 m", flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Peninos",   route: "Arista Hörnli",               date: "29 jul 2022", user: "Alex Roca",      userColor: "#EC4899" },
  { peakName: "Gran Paradiso",       altitudeM: 4061, altLabel: "4.061 m", flag: "🇮🇹", country: "Italia",        mountainRange: "Alpes Graios",    route: "Vía normal",                  date: "03 ago 2024", user: "Núria Bosch",    userColor: "#00995C" },
  { peakName: "Jungfrau",            altitudeM: 4158, altLabel: "4.158 m", flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Berneses",  route: "Ruta del Rottal",             date: "20 jul 2023", user: "Carla Vidal",    userColor: "#F97316" },
  { peakName: "Eiger",               altitudeM: 3967, altLabel: "3.967 m", flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Berneses",  route: "Arista O (vía normal)",       date: "16 sep 2023", user: "Marc Puig",      userColor: "#1E40AF" },
  { peakName: "Zugspitze",           altitudeM: 2962, altLabel: "2.962 m", flag: "🇩🇪", country: "Alemania",      mountainRange: "Alpes Bávaros",   route: "Vía normal SE",               date: "12 oct 2024", user: "Laia Font",      userColor: "#A855F7" },
  { peakName: "Watzmann",            altitudeM: 2713, altLabel: "2.713 m", flag: "🇩🇪", country: "Alemania",      mountainRange: "Berchtesgaden",   route: "Arista SO",                   date: "08 ago 2024", user: "Jordi Mas",      userColor: "#0E7490" },
  { peakName: "Alpspitze",           altitudeM: 2628, altLabel: "2.628 m", flag: "🇩🇪", country: "Alemania",      mountainRange: "Wetterstein",     route: "Vía normal E",                date: "25 jun 2024", user: "Alex Roca",      userColor: "#EC4899" },
  { peakName: "Ben Nevis",           altitudeM: 1345, altLabel: "1.345 m", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", country: "Escocia",        mountainRange: "Grampian",        route: "Mountain Track",              date: "17 may 2024", user: "Carla Vidal",    userColor: "#F97316" },
  { peakName: "Scafell Pike",        altitudeM:  978, altLabel: "978 m",   flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", country: "Inglaterra",     mountainRange: "Lake District",   route: "Ruta desde Wasdale Head",     date: "03 nov 2023", user: "Núria Bosch",    userColor: "#00995C" },
  { peakName: "Snowdon",             altitudeM: 1085, altLabel: "1.085 m", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", country: "Gales",          mountainRange: "Eryri",           route: "Llanberis Path",              date: "22 abr 2024", user: "Marc Puig",      userColor: "#1E40AF" },
  { peakName: "Buachaille Etive Mòr",altitudeM: 1021, altLabel: "1.021 m", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", country: "Escocia",        mountainRange: "Glen Coe",        route: "Vía SE por Coire na Tulaich", date: "09 jun 2024", user: "Laia Font",      userColor: "#A855F7" },
];

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
      {/* Sky */}
      <rect width="240" height="200" fill={`url(#sky-${uid})`} />
      {/* Far ridge */}
      <path d="M0 155 L40 110 L80 130 L130 90 L175 115 L210 85 L240 105 L240 200 L0 200Z"
        fill={terrainFar} />
      {/* Main peak */}
      <path d="M30 200 L120 55 L210 200Z" fill={terrainNear} />
      {/* Snow cap */}
      <path d="M120 55 L104 92 L120 84 L136 92Z" fill="rgba(255,255,255,0.88)" />
      {/* Subtle light face */}
      <path d="M120 55 L104 92 L120 84Z" fill="rgba(255,255,255,0.25)" />
      {/* Bottom overlay for text legibility */}
      <rect width="240" height="200" fill={`url(#ov-${uid})`} />
    </svg>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
const PHOTO_H = 200;

function CardFace({ card, index, flipped }: { card: CardData; index: number; flipped: boolean }) {
  const { name: rarity, color, ep } = rarityForAlt(card.altitudeM);
  const uid = `c${index}`;

  return (
    <div style={{
      width: "100%", height: "100%",
      transformStyle: "preserve-3d",
      transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
      transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
    }}>

      {/* ── Front — app card style ── */}
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
        <div style={{ flex: 1, position: "relative", overflow: "hidden", margin: "0 10px" , borderRadius: 14 }}>
          <MountainScene color={color} altM={card.altitudeM} uid={uid} />
          <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
            <div style={{
              fontSize: 17, fontWeight: 700, color: "#FFFFFF",
              lineHeight: 1.2, marginBottom: 4,
              textShadow: "0 1px 6px rgba(0,0,0,0.5)",
            }}>
              {card.peakName}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
              {card.flag} {card.country}
            </div>
          </div>
        </div>

        {/* Stat band — RAREZA · ALTITUD · RECOMPENSA */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "10px" }}>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: "#8A94A3", marginBottom: 4 }}>
              RAREZA
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: color + "20", borderRadius: 20, padding: "3px 8px" }}>
                <span style={{ color, fontSize: 10, lineHeight: 1 }}>✿</span>
                <span style={{ color, fontSize: 10, fontWeight: 700 }}>{rarity}</span>
              </div>
            </div>
          </div>

          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: "#8A94A3", marginBottom: 4 }}>
              ALTITUD
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0D2538", marginTop: 2 }}>{card.altLabel}</div>
          </div>

          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: "#8A94A3", marginBottom: 4 }}>
              RECOMPENSA
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", background: "#fef3c7", borderRadius: 20, padding: "3px 8px" }}>
                <span style={{ color: "#d97706", fontSize: 10, fontWeight: 700 }}>+{ep}</span>
              </div>
            </div>
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
        display: "flex", flexDirection: "column", padding: "18px 16px",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0D2538", flex: 1 }}>{card.peakName}</span>
          <span style={{
            background: `${color}18`, border: `1px solid ${color}40`,
            borderRadius: 100, padding: "2px 8px",
            fontSize: 9, color, fontWeight: 700,
          }}>✿ {rarity}</span>
        </div>

        {/* Detail rows */}
        {[
          { label: "Altitud",    value: card.altLabel,                    mono: true  },
          { label: "Cordillera", value: card.mountainRange,               mono: false },
          { label: "País",       value: `${card.flag} ${card.country}`,   mono: false },
          { label: "Fecha",      value: card.date,                        mono: false },
          { label: "Ruta",       value: card.route,                       mono: false },
          { label: "EP ganados", value: ep,                               mono: true  },
        ].map((s) => (
          <div key={s.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            padding: "7px 0", borderBottom: "1px solid rgba(13,37,56,0.06)", gap: 8,
          }}>
            <span style={{ fontSize: 10, color: "rgba(13,37,56,0.4)", fontWeight: 600, flexShrink: 0 }}>
              {s.label}
            </span>
            <span style={{
              fontSize: 10, textAlign: "right",
              color: s.label === "EP ganados" ? "#F97316" : "#0D2538",
              fontFamily: s.mono ? "var(--font-mono-landing, monospace)" : "inherit",
              fontWeight: s.label === "EP ganados" ? 700 : 500,
            }}>
              {s.label === "EP ganados" ? `+${s.value}` : s.value}
            </span>
          </div>
        ))}

        <div style={{ marginTop: "auto", paddingTop: 12, textAlign: "center",
          fontSize: 10, color: "rgba(13,37,56,0.25)" }}>
          ✓ Capturada · Peakadex
        </div>
      </div>
    </div>
  );
}

// ─── Coverflow carousel ───────────────────────────────────────────────────────
const CARD_W = 240;
const CARD_H = 410;

export default function LandingCards() {
  const [active, setActive] = useState(0);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [vw, setVw] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);
  const total = RAW.length;

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const dragStart   = useRef<number | null>(null);
  const dragging    = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelCooldown = useRef(false);

  const prev = useCallback(() => setActive((a) => (a - 1 + total) % total), [total]);
  const next = useCallback(() => setActive((a) => (a + 1) % total), [total]);

  // keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  // trackpad horizontal scroll
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
            <div className="ld-section-label">Cartas coleccionables</div>
            <h2 className="ld-display ld-section-title" style={{ marginTop: 12 }}>
              Cada cima,<br />una carta.
              <br />
              <span style={{ color: "var(--ld-gold)" }}>Tu colección,<br />tu leyenda.</span>
            </h2>
            <p className="ld-section-sub" style={{ marginTop: 20 }}>
              Cuando registras una ascensión, Peakadex genera una carta única
              de esa montaña. Anverso y reverso. Como un trofeo, pero que cabe en el bolsillo.
            </p>
            <p style={{ fontSize: 13, color: "rgba(13,37,56,0.4)", marginTop: 20, marginBottom: 28 }}>
              Las Snow Lotus son la rareza más difícil. Solo unos pocos las han capturado todas.
            </p>
            <a href="/register" className="ld-btn-primary" style={{ display: "inline-flex" }}>
              Empieza tu colección
            </a>
          </div>

          {/* ── Right column: carousel ── */}
          <div className="lc-right">
            {/* Coverflow */}
            <div
              ref={containerRef}
              style={{ position: "relative", height: CARD_H, perspective: 1200, overflow: "hidden" }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {RAW.map((card, i) => (
                <div key={card.peakName} style={cardStyle(i)} onClick={() => handleCardClick(i)}>
                  <CardFace card={card} index={i} flipped={!!flipped[i] && i === active} />
                </div>
              ))}
            </div>

            {/* Dot indicators */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 28 }}>
              {RAW.map((_, i) => (
                <button key={i} onClick={() => setActive(i)} aria-label={`Carta ${i + 1}`} style={{
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
                Toca la carta para ver el reverso
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
        @media (max-width: 560px) {
          .lc-left .ld-section-title { font-size: 30px !important; }
        }
      `}</style>
    </section>
  );
}
