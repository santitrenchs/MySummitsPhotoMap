"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/providers/I18nProvider";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AscentCardData = {
  id: string;
  date: string;
  route: string | null;
  description?: string | null;
  peak: {
    name: string;
    altitudeM: number;
    mountainRange?: string | null;
    latitude: number;
    longitude: number;
  };
  photoUrl: string | null;
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
      boxShadow: "0 0 0 2px rgba(255,255,255,0.5)",
    }}>
      {initials}
    </div>
  );
}

// ─── AscentCard ───────────────────────────────────────────────────────────────

export function AscentCard({ variant, ascent, locale, onDelete, isDeleting, animationIndex = 0 }: Props) {
  const router = useRouter();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const isProfile = variant === "profile";
  const dateStr = new Date(ascent.date).toLocaleDateString(locale, {
    day: "numeric", month: "short", year: "numeric",
  });

  const latStr = `${Math.abs(ascent.peak.latitude).toFixed(4)}°${ascent.peak.latitude >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(ascent.peak.longitude).toFixed(4)}°${ascent.peak.longitude >= 0 ? "E" : "W"}`;

  function handleCardClick() {
    if (isProfile && !navigating) {
      setNavigating(true);
      router.push(`/ascents/${ascent.id}`);
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        className="ascent-card"
        // @ts-expect-error CSS custom property
        style={{ "--card-i": Math.min(animationIndex, 8), cursor: navigating ? "wait" : undefined }}
        onClick={handleCardClick}
      >
        {/* ── Header (both variants) ──────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px 8px",
        }}>
          {ascent.user.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={ascent.user.avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0, boxShadow: "0 0 0 2px rgba(255,255,255,0.5)" }} />
            : <InitialsAvatar name={ascent.user.name} />
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#111827", margin: 0 }}>
              {ascent.user.name}
            </p>
          </div>
          {isProfile && (
            <div onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  width: 30, height: 30, borderRadius: "50%",
                  color: "#6b7280", fontSize: 20, lineHeight: 1,
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
                    onClick={() => { setMenuOpen(false); setNavigating(true); router.push(`/ascents/${ascent.id}`); }}
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
        </div>

        {/* ── Hero image with full overlay ────────────────────────────── */}
        <div style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden", background: "#e2e8f0" }}>
          {/* Image */}
          {ascent.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ascent.photoUrl}
              alt={ascent.peak.name}
              className="ascent-card-img"
            />
          ) : (
            <MountainPlaceholder />
          )}

          {/* Loading overlay */}
          {navigating && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 30,
              background: "rgba(0,0,0,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.3)",
                borderTopColor: "white",
                animation: "spin 0.7s linear infinite",
              }} />
            </div>
          )}


          {/* Bottom gradient (for peak name readability) */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 140,
            background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
            pointerEvents: "none",
          }} />



          {/* Bottom-left: peak name + route + date */}
          <div style={{
            position: "absolute", bottom: 12, left: 12, right: 72,
          }}>
            <p style={{
              margin: 0, fontSize: 18, fontWeight: 800, color: "white",
              lineHeight: 1.2, letterSpacing: "-0.01em",
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {ascent.peak.name}
            </p>
            {ascent.route && (
              <p style={{
                margin: "2px 0 0", fontSize: 12, fontWeight: 600,
                color: "rgba(255,255,255,0.85)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                textShadow: "0 1px 3px rgba(0,0,0,0.4)",
              }}>
                {ascent.route}
              </p>
            )}
            <p style={{
              margin: "3px 0 0", fontSize: 12, fontWeight: 500,
              color: "rgba(255,255,255,0.75)",
            }}>
              {dateStr}
            </p>
          </div>

          {/* Bottom-right: altitud (pill) + lat/lon (texto plano) debajo */}
          <div style={{
            position: "absolute", bottom: 12, right: 12,
            display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5,
          }}>
            <div style={{
              background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 20, padding: "5px 10px",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.01em" }}>
                {ascent.peak.altitudeM.toLocaleString(locale)} m
              </span>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: "rgba(255,255,255,0.75)",
              textShadow: "0 1px 3px rgba(0,0,0,0.6)",
              letterSpacing: "0.02em",
            }}>
              {latStr} · {lngStr}
            </span>
          </div>
        </div>

        {/* ── Below image ─────────────────────────────────────────────── */}
        <div style={{ padding: "10px 14px 12px" }} onClick={(e) => e.stopPropagation()}>

          {/* Line 1: bold username + "amb" companions (same format as detail page) */}
          <p style={{ fontSize: 14, color: "#111827", lineHeight: 1.5, margin: 0 }}>
            <span style={{ fontWeight: 700 }}>{ascent.user.name}</span>
            {ascent.persons.length > 0 && (
              <span style={{ fontWeight: 400 }}>
                {" "}{t.detail_with.toLowerCase()}{" "}
                {ascent.persons.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && (i === ascent.persons.length - 1 ? ` ${t.detail_and} ` : ", ")}
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                  </span>
                ))}
              </span>
            )}
          </p>

          {/* Line 2: description */}
          {ascent.description && (
            <p style={{
              fontSize: 14, color: "#374151", margin: "4px 0 0", lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {ascent.description}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
