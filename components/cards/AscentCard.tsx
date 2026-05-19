"use client";

import { useState, useEffect } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { PeakMiniMap, prefetchNearbyPeaks } from "@/components/cards/PeakMiniMap";
import { type RarityId, getRarityId, RARITY_LABELS, RARITY_EP, RARITY_COLORS } from "@/lib/rarity";

const APP_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.peakadex.com");

function getShareUrl(ascentId: string, locale: string) {
  return `${APP_URL}/ascent/${ascentId}?lang=${locale}`;
}

async function activatePublicShare(ascentId: string): Promise<void> {
  // 1. Set isPublic=true — must complete before sharing so OG endpoint works
  await fetch(`/api/ascents/${ascentId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPublic: true }),
  }).catch(() => {});

  // 2. Pre-warm the OG image cache — the server renders and caches the image
  //    so WhatsApp's scrape gets an instant response instead of timing out.
  await fetch(`/api/og/${ascentId}`).catch(() => {});
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
  const [isFlipped, setIsFlipped] = useState(false);
  const [sharePopover, setSharePopover] = useState<string | null>(null); // URL string when open
  const [linkCopied, setLinkCopied] = useState(false);

  const isProfile = variant === "profile";

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
            {isFlipped && (
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
                const url = getShareUrl(ascent.id, locale);
                const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
                if (isMobile && typeof navigator !== "undefined" && navigator.share) {
                  activatePublicShare(ascent.id);
                  navigator.share({ url, title: "Peakadex" }).catch(() => {});
                } else {
                  activatePublicShare(ascent.id);
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

            {/* Edit icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
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
              title={t.edit}
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: 30, height: 30, borderRadius: "50%",
                color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center",
                padding: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#2F7A5F"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9CA3AF"; }}
            >
              {/* Pencil edit icon */}
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2.5a2.121 2.121 0 0 1 3 3L6 17H3v-3L14.5 2.5z" />
              </svg>
            </button>
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
              ? <img src={ascent.photoUrl} alt={ascent.peak.name} loading="lazy" />
              : <MountainPlaceholder />
          }
          <div className="image-overlay" />
          {isMythic && <div className="mythic-badge">{t.card_mythic}</div>}
          <div className="peak-info">
            <div className="peak-name">{ascent.peak.name}</div>
            {ascent.route && <div className="peak-route">{ascent.route}</div>}
            <div className="peak-meta">
              <span>
                {ascent.peak.mountainRange
                  ? ascent.peak.mountainRange
                  : `${ascent.peak.altitudeM.toLocaleString(locale)} m`}
              </span>
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
                borderRadius: "var(--radius-full)", padding: "4px 10px",
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
                background: "#fef3c7", borderRadius: "var(--radius-full)", padding: "4px 10px",
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
          {/* Premium dark popover — anchored below share button */}
          <div
            style={{
              position: "absolute", top: 46, right: 8, left: 12,
              zIndex: 99,
              background: "#0D2538",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.40), 0 2px 8px rgba(0,0,0,0.20)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Actions area */}
            <div style={{ padding: "14px 14px 16px" }}>
              {/* Title */}
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                {t.card_shareTitle}
              </div>

              {/* WhatsApp row */}
              <button
                onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(sharePopover)}`, "_blank");
                }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "var(--radius-md)", padding: "11px 12px",
                  cursor: "pointer", marginBottom: 7, textAlign: "left",
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: "var(--radius-md)", flexShrink: 0, background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.335-1.508A11.933 11.933 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.893 0-3.667-.5-5.2-1.373l-.373-.22-3.861.919.978-3.761-.242-.387A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{t.card_shareWhatsapp}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>WhatsApp</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 4 13 10 7 16" />
                </svg>
              </button>

              {/* Copy link row */}
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(sharePopover);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 1500);
                }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "var(--radius-md)", padding: "11px 12px",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: "var(--radius-md)", flexShrink: 0, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {linkCopied
                      ? <polyline points="20 6 9 17 4 12" />
                      : <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>
                    }
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{t.card_shareCopyLink}</div>
                  <div style={{ fontSize: 11, color: linkCopied ? "#22c55e" : "rgba(255,255,255,0.45)", marginTop: 1 }}>
                    {linkCopied ? `✓ ${t.card_shareCopied}` : sharePopover.replace(/^https?:\/\/[^/]+/, "")}
                  </div>
                </div>
                {linkCopied ? (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 10 8 14 16 6" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="7 4 13 10 7 16" />
                  </svg>
                )}
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
