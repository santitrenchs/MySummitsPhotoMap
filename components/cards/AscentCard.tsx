"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AscentCardData = {
  id: string;
  date: string; // ISO string
  route: string | null;
  description?: string | null;
  peak: { name: string; altitudeM: number; mountainRange?: string | null };
  photoUrl: string | null;
  persons: { id: string; name: string }[];
  user: { name: string };
};

type Props = {
  variant: "social" | "profile";
  ascent: AscentCardData;
  locale: string;
  // profile-only
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  animationIndex?: number;
};

// ─── Mountain placeholder ─────────────────────────────────────────────────────

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
        <linearGradient id="mp-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
      </defs>
      <rect width="600" height="750" fill="url(#mp-sky)" />
      <polygon points="0,480 150,260 300,420 500,200 600,380 600,480" fill="url(#mp-far)" opacity="0.55" />
      <polygon points="300,60 520,520 80,520" fill="url(#mp-rock)" />
      <polygon points="300,60 370,200 300,185 230,200" fill="url(#mp-snow)" />
      <polygon points="300,60 390,230 300,210 210,230" fill="url(#mp-snow)" opacity="0.5" />
      <rect x="0" y="500" width="600" height="250" fill="url(#mp-ground)" />
      <polygon points="60,510 85,440 110,510" fill="#16a34a" />
      <polygon points="90,510 118,430 146,510" fill="#15803d" />
      <polygon points="125,510 155,445 185,510" fill="#16a34a" />
      <polygon points="415,510 443,440 471,510" fill="#16a34a" />
      <polygon points="450,510 480,430 510,510" fill="#15803d" />
      <polygon points="488,510 518,445 548,510" fill="#16a34a" />
    </svg>
  );
}

// ─── Person chip ──────────────────────────────────────────────────────────────

function PersonChip({ name }: { name: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 12, fontWeight: 600, color: "#374151",
      background: "#f3f4f6", border: "1px solid #e5e7eb",
      borderRadius: 20, padding: "3px 10px",
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: "50%",
        background: "#dbeafe", color: "#0369a1",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, fontWeight: 700, flexShrink: 0,
      }}>
        {name[0]?.toUpperCase()}
      </span>
      {name}
    </span>
  );
}

// ─── Initials avatar ──────────────────────────────────────────────────────────

function InitialsAvatar({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name[0]?.toUpperCase() ?? "?";
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
      color: "white", fontSize: 13, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 0 0 2px rgba(3,105,161,0.15)",
    }}>
      {initials}
    </div>
  );
}

// ─── AscentCard ───────────────────────────────────────────────────────────────

export function AscentCard({ variant, ascent, locale, onDelete, isDeleting, animationIndex = 0 }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isProfile = variant === "profile";
  const dateStr = new Date(ascent.date).toLocaleDateString(locale, {
    day: "numeric", month: "short", year: "numeric",
  });

  function handleCardClick() {
    if (isProfile) router.push(`/ascents/${ascent.id}`);
  }

  return (
    <>
      {/* Close menu on outside click */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 10 }}
        />
      )}

      <div
        className="ascent-card"
        // @ts-expect-error CSS custom property
        style={{ "--card-i": Math.min(animationIndex, 8) }}
        onClick={handleCardClick}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 14px 10px",
        }}>
          {/* Avatar */}
          {isProfile ? (
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #bfdbfe 0%, #dbeafe 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>⛰️</div>
          ) : (
            <InitialsAvatar name={ascent.user.name} />
          )}

          {/* Title + subtitle */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontWeight: 700, fontSize: 14, color: "#111827",
              margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {isProfile ? ascent.peak.name : ascent.user.name}
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
              {dateStr}
              {isProfile && ascent.peak.mountainRange ? ` · ${ascent.peak.mountainRange}` : ""}
            </p>
          </div>

          {/* ⋮ menu (profile only) */}
          {isProfile && onDelete && (
            <div
              style={{ position: "relative", flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "4px 8px", color: "#9ca3af", fontSize: 20, lineHeight: 1,
                }}
              >⋮</button>
              {menuOpen && (
                <div style={{
                  position: "absolute", right: 0, top: 30, zIndex: 20,
                  background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 120, overflow: "hidden",
                }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(ascent.id); }}
                    disabled={isDeleting}
                    style={{
                      display: "block", width: "100%", padding: "10px 16px",
                      textAlign: "left", background: "none", border: "none",
                      fontSize: 13, color: "#ef4444", cursor: "pointer",
                    }}
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Hero image (4:5) ────────────────────────────────────────── */}
        <div style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden", background: "#f1f5f9" }}>
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
          {/* Altitude badge — top right */}
          <div style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(0,0,0,0.52)", backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius: 20, padding: "5px 12px",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.01em" }}>
              {ascent.peak.altitudeM.toLocaleString(locale)} m
            </span>
          </div>
          {/* Bottom gradient scrim */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
            background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)",
            pointerEvents: "none",
          }} />
        </div>

        {/* ── Peak info ──────────────────────────────────────────────── */}
        <div style={{
          padding: isProfile ? "10px 14px 0" : "10px 14px 12px",
        }}>
          {/* Peak name (below image in social; also shown in social since header shows user name) */}
          {!isProfile && (
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e3a5f" }}>
              {ascent.peak.name}
            </p>
          )}
          {!isProfile && ascent.route && (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>
              {ascent.route}
            </p>
          )}
        </div>

        {/* ── Action bar (profile only) ───────────────────────────────── */}
        {isProfile && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "10px 14px 8px",
              borderBottom: "1px solid #f3f4f6",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="action-btn">
              <span style={{ fontSize: 18 }}>🤍</span>
            </button>
            {ascent.route && (
              <button className="action-btn" style={{ marginLeft: 6 }}>
                <span style={{ fontSize: 17 }}>🗺️</span>
                <span style={{ fontSize: 12, fontWeight: 600, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ascent.route}
                </span>
              </button>
            )}
            {ascent.persons.length > 0 && (
              <button className="action-btn" style={{ marginLeft: 6 }}>
                <span style={{ fontSize: 17 }}>👥</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{ascent.persons.length}</span>
              </button>
            )}
          </div>
        )}

        {/* ── Caption (profile only) ──────────────────────────────────── */}
        {isProfile && (ascent.description || ascent.persons.length > 0) && (
          <div style={{ padding: "10px 14px 14px" }}>
            {ascent.description && (
              <p style={{
                fontSize: 13, color: "#374151", margin: "0 0 8px", lineHeight: 1.5,
                display: "-webkit-box", WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {ascent.description}
              </p>
            )}
            {ascent.persons.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {ascent.persons.map((p) => <PersonChip key={p.id} name={p.name} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
