"use client";

import { useState, useEffect } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { PeakMiniMap } from "@/components/cards/PeakMiniMap";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AscentCardData = {
  id: string;
  date: string;
  route: string | null;
  description?: string | null;
  wikiloc?: string | null;
  peak: {
    id: string;
    name: string;
    altitudeM: number;
    isMythic?: boolean;
    mountainRange?: string | null;
    latitude: number;
    longitude: number;
  };
  photoUrl: string | null;
  photoId?: string | null;
  originalStorageKey?: string | null;
  persons: { id: string; name: string }[];
  user: { name: string; avatarUrl?: string | null };
};

type Props = {
  variant: "social" | "profile";
  ascent: AscentCardData;
  locale: string;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  animationIndex?: number;
};

// ─── Rarity system ───────────────────────────────────────────────────────────

type Rarity = "daisy" | "gentian" | "edelweiss" | "saxifrage";

function getRarity(altitudeM: number): Rarity {
  if (altitudeM >= 5000) return "saxifrage";
  if (altitudeM >= 3000) return "edelweiss";
  if (altitudeM >= 1500) return "gentian";
  return "daisy";
}

const RARITY_LABEL: Record<Rarity, string> = {
  daisy:     "Daisy",
  gentian:   "Gentian",
  edelweiss: "Edelweiss",
  saxifrage: "Saxifrage",
};

const RARITY_EP: Record<Rarity, number> = {
  daisy:     8,
  gentian:   16,
  edelweiss: 20,
  saxifrage: 100,
};


// ─── Mountain placeholder ────────────────────────────────────────────────────

function MountainPlaceholder() {
  return (
    <svg viewBox="0 0 600 750" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="mp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="60%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="mp-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="mp-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="mp-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>
      <rect width="600" height="750" fill="url(#mp-sky)" />
      <polygon points="0,480 150,260 300,420 500,200 600,380 600,480" fill="#bfdbfe" opacity="0.55" />
      <polygon points="300,60 520,520 80,520" fill="url(#mp-rock)" />
      <polygon points="300,60 370,200 300,185 230,200" fill="url(#mp-snow)" />
      <rect x="0" y="500" width="600" height="250" fill="url(#mp-ground)" />
      <polygon points="60,510 85,440 110,510" fill="#16a34a" />
      <polygon points="90,510 118,430 146,510" fill="#15803d" />
      <polygon points="415,510 443,440 471,510" fill="#16a34a" />
      <polygon points="450,510 480,430 510,510" fill="#15803d" />
    </svg>
  );
}

// ─── Initials avatar ─────────────────────────────────────────────────────────

function InitialsAvatar({ name, size = 34 }: { name: string; size?: number }) {
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name[0]?.toUpperCase() ?? "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
      color: "white", fontSize: size * 0.38, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {initials}
    </div>
  );
}

// ─── AscentCard ───────────────────────────────────────────────────────────────

export function AscentCard({ variant, ascent, locale, animationIndex = 0 }: Props) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const isProfile = variant === "profile";

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const rarity = getRarity(ascent.peak.altitudeM);
  const isMythic = ascent.peak.isMythic ?? false;

  const dateStr = new Date(ascent.date).toLocaleDateString(locale, {
    day: "numeric", month: "short", year: "numeric",
  });
  const latStr = `${Math.abs(ascent.peak.latitude).toFixed(4)}°${ascent.peak.latitude >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(ascent.peak.longitude).toFixed(4)}°${ascent.peak.longitude >= 0 ? "E" : "W"}`;

  const buildFace = (showMap: boolean) => (
    <>
      {/* User header */}
      <header className="card-user">
        {ascent.user.avatarUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={ascent.user.avatarUrl} alt="" className="pc-avatar" style={{ objectFit: "cover" }} />
          : <InitialsAvatar name={ascent.user.name} size={32} />
        }
        <div className="user-copy">
          <div className="user-name">{ascent.user.name}</div>
        </div>
        {isProfile ? (
          <div onClick={(e) => e.stopPropagation()}>
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
              <div style={{
                position: "absolute", right: 14, zIndex: 50,
                background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minWidth: 120, overflow: "hidden",
              }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    document.dispatchEvent(new CustomEvent("open-ascent-modal", {
                      detail: {
                        editAscent: {
                          id: ascent.id,
                          peakId: ascent.peak.id,
                          date: ascent.date.slice(0, 10),
                          route: ascent.route ?? null,
                          description: ascent.description ?? null,
                          wikiloc: ascent.wikiloc ?? null,
                          photoUrl: ascent.photoUrl ?? null,
                          photoId: ascent.photoId ?? null,
                          originalStorageKey: ascent.originalStorageKey ?? null,
                        },
                      },
                    }));
                  }}
                  style={{
                    display: "block", width: "100%", padding: "10px 16px",
                    textAlign: "left", background: "none", border: "none",
                    fontSize: 13, color: "#111827", cursor: "pointer",
                  }}
                >{t.edit}</button>
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: "#9CA3AF", fontSize: 20 }}>⋮</span>
        )}
      </header>

      {/* Inner frame */}
      <section className="capture-frame">
        <div className="capture-topbar">
          <span className="capture-label">{t.card_peakCapture}</span>
          <span className="capture-rarity-inline">
            <span className="rarity-icon">✿</span>
            <span className="rarity-value">{RARITY_LABEL[rarity]}</span>
          </span>
        </div>
        <div className="image-frame">
          {showMap && isFlipped
            ? <PeakMiniMap lat={ascent.peak.latitude} lng={ascent.peak.longitude} peakId={ascent.peak.id} peakName={ascent.peak.name} altitudeM={ascent.peak.altitudeM} />
            : ascent.photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={ascent.photoUrl} alt={ascent.peak.name} />
              : <MountainPlaceholder />
          }
          <div className="image-overlay" />
          {isMythic && <div className="mythic-badge">{t.card_mythic}</div>}
          <div className="peak-info">
            <div className="peak-name">{ascent.peak.name}</div>
            {ascent.route && <div className="peak-route">{ascent.route}</div>}
            <div className="peak-meta">
              <span>{dateStr}</span>
              <span>{latStr} · {lngStr}</span>
            </div>
          </div>
        </div>
        <div className="stat-band">
          <div className="stat-item">
            <span className="stat-label">{t.card_altitude}</span>
            <div className="stat-value">{ascent.peak.altitudeM.toLocaleString(locale)} m</div>
          </div>
          <div className="stat-item" style={{ textAlign: "right" }}>
            <span className="stat-label">{t.card_reward}</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, whiteSpace: "nowrap" }}>
              <span className="stat-value ep">+{RARITY_EP[rarity]} EP</span>
              {isMythic && (
                <>
                  <span style={{ color: "#d1d5db", fontSize: 12 }}>·</span>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="#f59e0b" style={{ flexShrink: 0 }}>
                    <ellipse cx="10" cy="17" rx="6" ry="2.5"/>
                    <ellipse cx="10" cy="12" rx="4.5" ry="2"/>
                    <ellipse cx="10" cy="7.5" rx="3" ry="1.8"/>
                    <ellipse cx="10" cy="4" rx="1.8" ry="1.3"/>
                  </svg>
                  <span className="stat-value" style={{ color: "#f59e0b" }}>1 Cairn</span>
                </>
              )}
            </div>
          </div>
        </div>
        <footer className="capture-note">
          <p className="note-byline">
            <strong>{ascent.user.name}</strong>
            {ascent.persons.length > 0 && (
              <>
                {" "}{t.detail_with.toLowerCase()}{" "}
                {ascent.persons.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && (i === ascent.persons.length - 1 ? ` ${t.detail_and} ` : ", ")}
                    <strong>{p.name}</strong>
                  </span>
                ))}
              </>
            )}
          </p>
          {ascent.description && (
            <p className="note-text">{ascent.description}</p>
          )}
        </footer>
      </section>
    </>
  );

  return (
    <div
      className={`flip-card${isFlipped ? " is-flipped" : ""}`}
      onClick={() => setIsFlipped(f => !f)}
    >
      <article
        className={`peak-card ${rarity} flip-inner${isMythic ? " mythic" : ""}`}
        // @ts-expect-error CSS custom property
        style={{ "--card-i": Math.min(animationIndex, 8) }}
      >
        <div className="card-face card-front">{buildFace(false)}</div>
        <div className="card-face card-back">{buildFace(true)}</div>
      </article>
    </div>
  );
}
