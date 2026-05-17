"use client";

import { useState, useEffect } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { PeakMiniMap, prefetchNearbyPeaks } from "@/components/cards/PeakMiniMap";
import { type RarityId, getRarityId, RARITY_LABELS, RARITY_EP, RARITY_COLORS } from "@/lib/rarity";

const APP_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.peakadex.com");

function getShareUrl(ascentId: string) {
  return `${APP_URL}/ascent/${ascentId}`;
}

function activatePublicShare(ascentId: string) {
  // Fire and forget — sets isPublic=true in the background
  fetch(`/api/ascents/${ascentId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPublic: true }),
  }).catch(() => {/* ignore */});
}

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
    wikiUrl?: string | null;
    wikiBody?: string | null;
  };
  photoUrl: string | null;
  photoId?: string | null;
  originalStorageKey?: string | null;
  persons: { id: string; name: string }[];
  user: { name: string; avatarUrl?: string | null };
  peakStats?: { totalAscents: number; uniqueClimbers: number };
};

type Props = {
  variant: "social" | "profile";
  ascent: AscentCardData;
  locale: string;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  animationIndex?: number;
};

// ─── Rarity aliases (lib/rarity.ts is the source of truth) ───────────────────

type Rarity = RarityId;
const getRarity = getRarityId;
const RARITY_LABEL = RARITY_LABELS;
const RARITY_COLOR = RARITY_COLORS;


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
  const [preloading, setPreloading] = useState(false);
  const [sharePopover, setSharePopover] = useState<string | null>(null); // URL string when open
  const [linkCopied, setLinkCopied] = useState(false);

  const isProfile = variant === "profile";

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  useEffect(() => {
    prefetchNearbyPeaks(ascent.peak.id, ascent.peak.latitude, ascent.peak.longitude);
  }, [ascent.peak.id, ascent.peak.latitude, ascent.peak.longitude]);

  const rarity = getRarity(ascent.peak.altitudeM);
  const isMythic = ascent.peak.isMythic ?? false;

  const dateStr = new Date(ascent.date).toLocaleDateString(locale, {
    day: "numeric", month: "short", year: "numeric",
  });
  const latStr = `${Math.abs(ascent.peak.latitude).toFixed(4)}°${ascent.peak.latitude >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(ascent.peak.longitude).toFixed(4)}°${ascent.peak.longitude >= 0 ? "E" : "W"}`;

  const buildBack = () => {
    const barPct = Math.min(100, (ascent.peak.altitudeM / 8849) * 100).toFixed(1);
    return (
      <>
        <section className="capture-frame">
          <div className="image-frame">
            {(isFlipped || preloading) && (
              <PeakMiniMap
                lat={ascent.peak.latitude}
                lng={ascent.peak.longitude}
                peakId={ascent.peak.id}
                peakName={ascent.peak.name}
                altitudeM={ascent.peak.altitudeM}
              />
            )}
            <div className="back-map-gradient" />
            {isMythic && <div className="mythic-badge">{t.card_mythic}</div>}
            <div className="back-map-data">
              <div className="back-map-geo">📍 {latStr} · {lngStr}</div>
              <div className="back-map-name">{ascent.peak.name}</div>
              <div className="back-map-alt">{ascent.peak.altitudeM.toLocaleString(locale)} m</div>
              {ascent.peak.mountainRange && (
                <div className="back-map-zone">{ascent.peak.mountainRange}</div>
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
              <div className="stat-value">{ascent.peakStats?.totalAscents ?? "—"}</div>
            </div>
            <div className="stat-item" style={{ textAlign: "right" }}>
              <span className="stat-label">Alpinistas</span>
              <div className="stat-value">{ascent.peakStats?.uniqueClimbers ?? "—"}</div>
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
  };

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
          <div className="user-date">{dateStr}</div>
        </div>
        {isProfile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 2 }} onClick={(e) => e.stopPropagation()}>
            {/* Share icon — always visible */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                activatePublicShare(ascent.id);
                const url = getShareUrl(ascent.id);
                const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
                if (isMobile && typeof navigator !== "undefined" && navigator.share) {
                  navigator.share({ url, title: "Peakadex" }).catch(() => {});
                } else {
                  setSharePopover(url);
                }
              }}
              title={t.card_share}
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: 30, height: 30, borderRadius: "50%",
                color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center",
                padding: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#2F7A5F"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9CA3AF"; }}
            >
              {/* Share network icon — 3 nodes connected */}
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="16" cy="4" r="2" />
                <circle cx="4" cy="10" r="2" />
                <circle cx="16" cy="16" r="2" />
                <line x1="6" y1="9" x2="14" y2="5" />
                <line x1="6" y1="11" x2="14" y2="15" />
              </svg>
            </button>

            {/* Edit menu ⋮ */}
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
                          peakName: ascent.peak.name,
                          date: ascent.date.slice(0, 10),
                          route: ascent.route ?? null,
                          description: ascent.description ?? null,
                          wikiloc: ascent.wikiloc ?? null,
                          photoUrl: ascent.photoUrl ?? null,
                          photoId: ascent.photoId ?? null,
                          originalStorageKey: ascent.originalStorageKey ?? null,
                          persons: ascent.persons.map((p) => ({ id: p.id, name: p.name })),
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
        ) : null}
      </header>

      {/* Inner frame */}
      <section className="capture-frame">
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
              <span>{latStr} · {lngStr}</span>
            </div>
          </div>
        </div>
        <div className="stat-band">
          <div className="stat-item" style={{ textAlign: "center" }}>
            <span className="stat-label">{t.card_rarity}</span>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: RARITY_COLOR[rarity] + "20",
                borderRadius: 20, padding: "4px 10px",
              }}>
                <span style={{ color: RARITY_COLOR[rarity], fontSize: 11, lineHeight: 1 }}>✿</span>
                <span style={{ color: RARITY_COLOR[rarity], fontSize: 11, fontWeight: 700 }}>{RARITY_LABEL[rarity]}</span>
              </div>
            </div>
          </div>
          <div className="stat-item" style={{ textAlign: "center" }}>
            <span className="stat-label">{t.card_altitude}</span>
            <div className="stat-value" style={{ textAlign: "center", marginTop: 2, fontSize: 11, whiteSpace: "nowrap" }}>{ascent.peak.altitudeM.toLocaleString(locale)} m</div>
          </div>
          <div className="stat-item" style={{ textAlign: "center" }}>
            <span className="stat-label">{t.card_reward}</span>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "#fef3c7", borderRadius: 20, padding: "4px 10px",
                whiteSpace: "nowrap",
              }}>
                {isMythic && (
                  <>
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="#f59e0b" style={{ flexShrink: 0 }}>
                      <ellipse cx="10" cy="17" rx="6" ry="2.5"/>
                      <ellipse cx="10" cy="12" rx="4.5" ry="2"/>
                      <ellipse cx="10" cy="7.5" rx="3" ry="1.8"/>
                      <ellipse cx="10" cy="4" rx="1.8" ry="1.3"/>
                    </svg>
                    <span style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700 }}>1 Cairn ·</span>
                  </>
                )}
                <span style={{ color: "#d97706", fontSize: 13, fontWeight: 700 }}>+{RARITY_EP[rarity]} EP</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );

  return (
    <div style={{ position: "relative" }}>
      <div
        className={`flip-card${isFlipped ? " is-flipped" : ""}`}
        onClick={() => setIsFlipped(f => !f)}
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
      {sharePopover && (
        <>
          {/* Backdrop — tap outside to close */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 98 }}
            onClick={() => { setSharePopover(null); setLinkCopied(false); }}
          />
          {/* Popover — anchored below share button (top-right of header) */}
          <div
            style={{
              position: "absolute", top: 46, right: 8, left: 12,
              zIndex: 99,
              background: "#fff",
              border: "1px solid #E8EBEE",
              borderRadius: 14,
              boxShadow: "0 8px 32px rgba(13,37,56,0.14)",
              padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Link icon */}
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔗</span>
            {/* URL */}
            <span style={{
              flex: 1, fontSize: 12, color: "#5A6E84",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {sharePopover.replace(/^https?:\/\//, "")}
            </span>
            {/* Copy button */}
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(sharePopover);
                setLinkCopied(true);
                setTimeout(() => { setSharePopover(null); setLinkCopied(false); }, 1500);
              }}
              style={{
                flexShrink: 0,
                background: linkCopied ? "#2F7A5F" : "#0D2538",
                color: "#fff",
                border: "none", borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                padding: "6px 12px", cursor: "pointer",
                transition: "background 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {linkCopied ? `✓ ${t.card_shareCopied}` : t.card_share}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
