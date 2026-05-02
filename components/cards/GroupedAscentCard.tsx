"use client";

import { useState, useRef, useEffect } from "react";
import type { AscentData } from "@/components/ascents/AscentsClient";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import { PeakMiniMap } from "@/components/cards/PeakMiniMap";

// ─── Rarity (shared logic with AscentCard) ────────────────────────────────────

type Rarity = "daisy" | "gentian" | "edelweiss" | "saxifrage" | "cinquefoil" | "snow_lotus";

function getRarity(altitudeM: number): Rarity {
  if (altitudeM >= 8000) return "snow_lotus";
  if (altitudeM >= 7000) return "cinquefoil";
  if (altitudeM >= 5000) return "saxifrage";
  if (altitudeM >= 3000) return "edelweiss";
  if (altitudeM >= 1500) return "gentian";
  return "daisy";
}

const RARITY_LABEL: Record<Rarity, string> = {
  daisy:      "Daisy",
  gentian:    "Gentian",
  edelweiss:  "Edelweiss",
  saxifrage:  "Saxifrage",
  cinquefoil: "Cinquefoil",
  snow_lotus: "Snow Lotus",
};

const RARITY_EP: Record<Rarity, number> = {
  daisy:      8,
  gentian:    16,
  edelweiss:  20,
  saxifrage:  100,
  cinquefoil: 500,
  snow_lotus: 1000,
};

// ─── Avatar colors (deterministic by index) ───────────────────────────────────

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
  "linear-gradient(135deg, #059669 0%, #34d399 100%)",
  "linear-gradient(135deg, #dc2626 0%, #f87171 100%)",
  "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)",
];

function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0]?.toUpperCase() ?? "?";
}

// ─── Mountain placeholder ────────────────────────────────────────────────────

function MountainPlaceholder() {
  return (
    <svg viewBox="0 0 600 750" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="gac-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="60%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="gac-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="gac-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="gac-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>
      <rect width="600" height="750" fill="url(#gac-sky)" />
      <polygon points="0,480 150,260 300,420 500,200 600,380 600,480" fill="#bfdbfe" opacity="0.55" />
      <polygon points="300,60 520,520 80,520" fill="url(#gac-rock)" />
      <polygon points="300,60 370,200 300,185 230,200" fill="url(#gac-snow)" />
      <rect x="0" y="500" width="600" height="250" fill="url(#gac-ground)" />
      <polygon points="60,510 85,440 110,510" fill="#16a34a" />
      <polygon points="90,510 118,430 146,510" fill="#15803d" />
      <polygon points="415,510 443,440 471,510" fill="#16a34a" />
      <polygon points="450,510 480,430 510,510" fill="#15803d" />
    </svg>
  );
}

// ─── Nav arrow button ────────────────────────────────────────────────────────

function NavArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: "left" | "right";
  onClick: (e: React.MouseEvent) => void;
  disabled: boolean;
}) {
  if (disabled) return null;
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        [direction === "left" ? "left" : "right"]: 10,
        zIndex: 10,
        background: "rgba(0,0,0,0.38)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "50%",
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: 20,
        lineHeight: 1,
        cursor: "pointer",
        padding: 0,
      }}
    >
      {direction === "left" ? "‹" : "›"}
    </button>
  );
}

// ─── GroupedAscentCard ────────────────────────────────────────────────────────

type Props = {
  ascents: AscentData[];
  currentUserEmail?: string | null;
  currentUserName?: string;
  animationIndex?: number;
  peakStats?: { totalAscents: number; uniqueClimbers: number };
};

export function GroupedAscentCard({
  ascents,
  currentUserEmail,
  currentUserName,
  animationIndex = 0,
  peakStats,
}: Props) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [preloading, setPreloading] = useState(false);
  const [currentDisplay, setCurrentDisplay] = useState(0);

  const currentRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const count = ascents.length;
  const ownAscent = ascents.find((a) => a.isOwn) ?? null;

  const rarity = getRarity(ascents[0].peak.altitudeM);
  const isMythic = ascents[0].peak.isMythic ?? false;

  const peak = ascents[0].peak;

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  function goTo(idx: number) {
    const next = Math.max(0, Math.min(idx, count - 1));
    currentRef.current = next;
    setCurrentDisplay(next);
    if (trackRef.current) {
      trackRef.current.style.transition = "transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      trackRef.current.style.transform = `translateX(-${next * 100}%)`;
    }
  }

  const slide = ascents[currentDisplay];
  const slidePersons = slide.persons.filter((p) => p.id !== slide.createdByUserId);

  const buildBack = () => {
    const barPct = Math.min(100, (peak.altitudeM / 8849) * 100).toFixed(1);
    const latStr = `${Math.abs(peak.latitude).toFixed(4)}°${peak.latitude >= 0 ? "N" : "S"}`;
    const lngStr = `${Math.abs(peak.longitude).toFixed(4)}°${peak.longitude >= 0 ? "E" : "W"}`;
    return (
      <section className="capture-frame">
        <div className="capture-topbar">
          <span className="capture-label">{t.card_peakCapture}</span>
          <span className="capture-rarity-inline">
            <span className="rarity-icon">✿</span>
            <span className="rarity-value">{RARITY_LABEL[rarity]}</span>
          </span>
        </div>
        <div className="image-frame">
          {(isFlipped || preloading) && (
            <PeakMiniMap
              lat={peak.latitude}
              lng={peak.longitude}
              peakId={peak.id}
              peakName={peak.name}
              altitudeM={peak.altitudeM}
            />
          )}
          <div className="back-map-gradient" />
          {isMythic && <div className="mythic-badge">{t.card_mythic}</div>}
          <div className="back-map-data">
            <div className="back-map-geo">📍 {latStr} · {lngStr}</div>
            <div className="back-map-name">{peak.name}</div>
            <div className="back-map-alt">{peak.altitudeM.toLocaleString(t.dateLocale)} m</div>
            {peak.mountainRange && (
              <div className="back-map-zone">{peak.mountainRange}</div>
            )}
            <div className="back-bar-wrap">
              <div className="back-bar-track">
                <div className="back-bar-fill" style={{ width: `${barPct}%` }} />
              </div>
              <div className="back-bar-labels"><span>0 m</span><span>8.849 m</span></div>
            </div>
          </div>
        </div>
        <div className="back-stats-eyebrow">Estadísticas Peakadex</div>
        <div className="stat-band">
          <div className="stat-item">
            <span className="stat-label">Ascensiones</span>
            <div className="stat-value">{peakStats?.totalAscents ?? "—"}</div>
          </div>
          <div className="stat-item" style={{ textAlign: "right" }}>
            <span className="stat-label">Alpinistas</span>
            <div className="stat-value">{peakStats?.uniqueClimbers ?? "—"}</div>
          </div>
        </div>
      </section>
    );
  };

  const buildFace = (showMap: boolean) => (
    <>
      {/* User header */}
      <header className="card-user">
        {/* Overlapping avatar stack — up to 4 */}
        <div style={{ display: "flex", flexShrink: 0 }}>
          {ascents.slice(0, 4).map((a, idx) => (
            <div
              key={a.id}
              style={{
                width: 32, height: 32,
                borderRadius: "50%",
                border: "2px solid white",
                marginLeft: idx === 0 ? 0 : -10,
                background: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length],
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "white",
                flexShrink: 0, position: "relative",
                zIndex: ascents.length - idx,
                overflow: "hidden",
              }}
            >
              {a.userAvatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.userAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials(a.userName)
              }
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Perspectives badge */}
        <div style={{
          flexShrink: 0,
          display: "inline-flex", alignItems: "center",
          background: "#fef3c7", border: "1px solid #fde68a",
          color: "#92400e", fontSize: 10, fontWeight: 800,
          padding: "3px 9px", borderRadius: 20,
          letterSpacing: "0.01em", whiteSpace: "nowrap",
        }}>
          {i(t.ascents_perspectives, { n: count })}
        </div>

        {/* ⋮ menu — only if current user has an ascent in the group */}
        {ownAscent && (
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: 30, height: 30, borderRadius: "50%",
                color: "#9CA3AF", fontSize: 20, lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >⋮</button>
            {menuOpen && (
              <div
                style={{
                  position: "absolute", right: 0, top: 34, zIndex: 50,
                  background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minWidth: 120, overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    document.dispatchEvent(new CustomEvent("open-ascent-modal", {
                      detail: {
                        editAscent: {
                          id: ownAscent.id,
                          peakId: ownAscent.peak.id,
                          peakName: ownAscent.peak.name,
                          date: ownAscent.date.slice(0, 10),
                          route: ownAscent.route ?? null,
                          description: ownAscent.description ?? null,
                          wikiloc: ownAscent.wikiloc ?? null,
                          photoUrl: ownAscent.firstPhotoUrl ?? null,
                          photoId: ownAscent.firstPhotoId ?? null,
                          originalStorageKey: ownAscent.firstPhotoOriginalKey ?? null,
                          persons: ownAscent.persons.map((p) => ({ id: p.id, name: p.name })),
                        },
                      },
                    }));
                  }}
                  style={{
                    display: "block", width: "100%", padding: "10px 16px",
                    textAlign: "left", background: "none", border: "none",
                    fontSize: 13, color: "#111827", cursor: "pointer",
                  }}
                >
                  {t.edit}
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Inner frame */}
      <section className="capture-frame">
        {/* Topbar */}
        <div className="capture-topbar">
          <span className="capture-label">{t.card_peakCapture}</span>
          <span className="capture-rarity-inline">
            <span className="rarity-icon">✿</span>
            <span className="rarity-value">{RARITY_LABEL[rarity]}</span>
          </span>
        </div>

        {/* Image area */}
        <div className="image-frame">
          {showMap ? (
            <PeakMiniMap
              lat={peak.latitude}
              lng={peak.longitude}
              peakId={peak.id}
              peakName={peak.name}
              altitudeM={peak.altitudeM}
            />
          ) : (
            <>
              {/* Carousel track */}
              <div
                ref={trackRef}
                style={{ position: "absolute", inset: 0, display: "flex", willChange: "transform" }}
              >
                {ascents.map((a, idx) => {
                  const dateStr = new Date(a.date).toLocaleDateString(t.dateLocale, {
                    day: "numeric", month: "short", year: "numeric",
                  });
                  const latStr = `${Math.abs(a.peak.latitude).toFixed(4)}°${a.peak.latitude >= 0 ? "N" : "S"}`;
                  const lngStr = `${Math.abs(a.peak.longitude).toFixed(4)}°${a.peak.longitude >= 0 ? "E" : "W"}`;
                  return (
                    <div
                      key={a.id}
                      style={{
                        minWidth: "100%", height: "100%",
                        position: "relative", flexShrink: 0,
                        overflow: "hidden", background: "#e2e8f0",
                      }}
                    >
                      {a.firstPhotoUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img
                            src={a.firstPhotoUrl}
                            alt={a.peak.name}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
                          />
                        : <MountainPlaceholder />
                      }
                      <div className="image-overlay" />
                      {/* Slide counter */}
                      <div style={{
                        position: "absolute", top: 12, right: 12,
                        background: "rgba(0,0,0,0.42)", backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        color: "white", fontSize: 11, fontWeight: 700,
                        padding: "4px 10px", borderRadius: 20,
                        border: "1px solid rgba(255,255,255,0.18)",
                        letterSpacing: "0.03em",
                      }}>
                        {idx + 1} / {count}
                      </div>
                      <div className="peak-info">
                        <div className="peak-name">{a.peak.name}</div>
                        {a.route && <div className="peak-route">{a.route}</div>}
                        <div className="peak-meta">
                          <span>{dateStr}</span>
                          <span>{latStr} · {lngStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation arrows */}
              {count > 1 && (
                <>
                  <NavArrow
                    direction="left"
                    disabled={currentDisplay === 0}
                    onClick={(e) => { e.stopPropagation(); goTo(currentDisplay - 1); }}
                  />
                  <NavArrow
                    direction="right"
                    disabled={currentDisplay === count - 1}
                    onClick={(e) => { e.stopPropagation(); goTo(currentDisplay + 1); }}
                  />
                </>
              )}
            </>
          )}
        </div>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, padding: "10px 0 4px" }}>
          {ascents.map((_, idx) => (
            <div
              key={idx}
              onClick={(e) => { e.stopPropagation(); goTo(idx); }}
              style={{
                height: 6,
                width: idx === currentDisplay ? 20 : 6,
                borderRadius: 3,
                background: idx === currentDisplay ? "#0369a1" : "#e5e7eb",
                transition: "width 0.22s ease, background 0.22s ease",
                flexShrink: 0,
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        {/* Stat band */}
        <div className="stat-band">
          <div className="stat-item">
            <span className="stat-label">{t.card_altitude}</span>
            <div className="stat-value">{ascents[0].peak.altitudeM.toLocaleString(t.dateLocale)} m</div>
          </div>
          <div className="stat-item" style={{ textAlign: "right" }}>
            <span className="stat-label">{t.card_reward}</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, whiteSpace: "nowrap" }}>
              {isMythic && (
                <>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="#f59e0b" style={{ flexShrink: 0 }}>
                    <ellipse cx="10" cy="17" rx="6" ry="2.5"/>
                    <ellipse cx="10" cy="12" rx="4.5" ry="2"/>
                    <ellipse cx="10" cy="7.5" rx="3" ry="1.8"/>
                    <ellipse cx="10" cy="4" rx="1.8" ry="1.3"/>
                  </svg>
                  <span className="stat-value" style={{ color: "#f59e0b" }}>1 Cairn</span>
                  <span style={{ color: "#d1d5db", fontSize: 12 }}>·</span>
                </>
              )}
              <span className="stat-value ep">+{RARITY_EP[rarity]} EP</span>
            </div>
          </div>
        </div>

        {/* Caption */}
        <footer className="capture-note">
          <p className="note-byline">
            <strong>{slide.userName}</strong>
            {slidePersons.length > 0 && (
              <>
                {" "}{t.detail_with.toLowerCase()}{" "}
                {slidePersons.map((p, idx) => (
                  <span key={p.id}>
                    {idx > 0 && (idx === slidePersons.length - 1 ? ` ${t.detail_and} ` : ", ")}
                    <strong>{p.name}</strong>
                  </span>
                ))}
              </>
            )}
          </p>
          {slide.description && (
            <p className="note-text">{slide.description}</p>
          )}
        </footer>
      </section>
    </>
  );

  return (
    <div
      className={`flip-card${isFlipped ? " is-flipped" : ""}`}
      onClick={() => setIsFlipped((f) => !f)}
      onMouseEnter={() => setPreloading(true)}
      onTouchStart={() => setPreloading(true)}
    >
      <article
        className={`peak-card ${rarity} flip-inner${isMythic ? " mythic" : ""}`}
        // @ts-expect-error CSS custom property
        style={{ "--card-i": Math.min(animationIndex, 8) }}
      >
        <div className="card-face card-front">{buildFace(false)}</div>
        <div className="card-face card-back">{buildBack()}</div>
      </article>
    </div>
  );
}
