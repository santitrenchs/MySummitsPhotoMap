"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Sprite: /public/brand/iconos.png — 40×200px, 4 icons of 40×50px each
// Order: 0=Peakadex, 1=Azimut, 2=Actividad, 3=+
function SpriteIcon({ index, size = 20, active = false }: { index: number; size?: number; active?: boolean }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      backgroundImage: "url('/brand/iconos.png')",
      backgroundSize: `${size}px ${size * 5}px`,
      backgroundPosition: `0 ${-(index * size * 1.25 + size * 0.125)}px`,
      backgroundRepeat: "no-repeat",
      opacity: active ? 1 : 0.55,
      transition: "opacity 150ms ease",
    }} />
  );
}

function PeakadexLogo({ height = 44 }: { height?: number }) {
  const iconSize = Math.round(height * 1.21);
  const [spinning, setSpinning] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, whiteSpace: "nowrap", fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: height * 0.72, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
      <span className="azisb-logo-text azisb-logo-peak" style={{ color: "#0D2538", marginRight: Math.round(8 * 1.12) }}>peak</span>
      <svg width={iconSize} height={iconSize} viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"
        onClick={() => setSpinning(true)}
        onAnimationEnd={() => setSpinning(false)}
        style={{ display: "block", flexShrink: 0, transform: "translateY(2px)", cursor: "pointer", animation: spinning ? "ball-spin 0.7s linear" : undefined }}>
        <ellipse cx="15" cy="27" rx="8" ry="2.5" fill="rgba(0,0,0,.15)"/>
        <circle cx="15" cy="15" r="13" fill="white"/>
        <path d="M 2,15 A 13,13 0 0,1 28,15 Z" fill="#DC2626"/>
        <circle cx="15" cy="15" r="13" fill="none" stroke="#991B1B" strokeWidth="1.2"/>
        <rect x="1" y="13" width="28" height="4" fill="white"/>
        <line x1="2" y1="15" x2="28" y2="15" stroke="#991B1B" strokeWidth="1.2"/>
        <circle cx="15" cy="15" r="4.5" fill="white" stroke="#991B1B" strokeWidth="1.5"/>
        <path d="M 6,8 A 13,13 0 0,1 24,8 Q 22,13 15,14 Q 8,13 6,8 Z" fill="white" opacity=".25"/>
      </svg>
      <span className="azisb-logo-text azisb-logo-adex" style={{ color: "#8a9bb0", marginLeft: 7 }}>adex</span>
    </div>
  );
}
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useT } from "@/components/providers/I18nProvider";

const EXPANDED_W = 240;
const COLLAPSED_W = 68;

type Props = {
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl?: string | null;
  pendingFriendRequests?: number;
};

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const p = name.trim().split(" ");
    if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
    return name[0]?.toUpperCase() ?? "U";
  }
  return email?.[0]?.toUpperCase() ?? "U";
}

export function Sidebar({
  userName,
  userEmail,
  userAvatarUrl,
  pendingFriendRequests = 0,
}: Props) {
  const pathname = usePathname();
  const t = useT();
  const [hovered, setHovered] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const abbr = getInitials(userName, userEmail);
  const badge = pendingFriendRequests;

  const collapsed = !hovered && !userMenuOpen;

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [userMenuOpen]);

  const active = (href: string) => {
    if (href === "/ascents") {
      // Don't mark Bitácora active when on the new-ascent form
      return pathname === "/ascents" || (pathname.startsWith("/ascents/") && pathname !== "/ascents/new");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      <style>{CSS}</style>
      <aside
        className={`azisb${collapsed ? " azisb--c" : ""}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >

        {/* ── Brand ─────────────────────────────── */}
        <Link href="/home" className="azisb-brand" data-tip="peakadex">
          <span className="azisb-brand-wrap">
            <PeakadexLogo height={32} />
          </span>
        </Link>

        {/* ── Nav ───────────────────────────────── */}
        <div className="azisb-divider" />
        <nav className="azisb-nav">
          <Link
            href="/home"
            className={`azisb-item${active("/home") ? " azisb-item--on" : ""}`}
            data-tip={t.nav_home}
          >
            <span className="azisb-ic"><SpriteIcon index={0} size={28} active={active("/home")} /></span>
            <span className="azisb-lbl">{t.nav_home}</span>
          </Link>
          <Link
            href="/map"
            className={`azisb-item${active("/map") ? " azisb-item--on" : ""}`}
            data-tip={t.nav_map}
          >
            <span className="azisb-ic"><SpriteIcon index={1} size={28} active={active("/map")} /></span>
            <span className="azisb-lbl">{t.nav_map}</span>
          </Link>
          <Link
            href="/ascents"
            className={`azisb-item${active("/ascents") ? " azisb-item--on" : ""}`}
            data-tip={t.nav_ascents}
          >
            <span className="azisb-ic"><SpriteIcon index={2} size={28} active={active("/ascents")} /></span>
            <span className="azisb-lbl">{t.nav_ascents}</span>
          </Link>
          <button
            className="azisb-item"
            data-tip="Nueva ascensión"
            onClick={() => document.dispatchEvent(new CustomEvent("open-ascent-modal"))}
          >
            <span className="azisb-ic"><SbPlusIcon /></span>
            <span className="azisb-lbl">Nueva ascensión</span>
          </button>
        </nav>

        {/* ── User footer ────────────────────────── */}
        <div className="azisb-footer" ref={menuRef}>
          <div
            className="azisb-user"
            onClick={() => setUserMenuOpen((o) => !o)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setUserMenuOpen((o) => !o);
            }}
            aria-label="User menu"
            aria-expanded={userMenuOpen}
            data-tip={userName ?? undefined}
          >
            <div className="azisb-avatar" style={{ position: "relative" }}>
              {userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userAvatarUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                />
              ) : (
                abbr
              )}
              {badge > 0 && <span className="azisb-badge">{badge}</span>}
            </div>
            <div className="azisb-uinfo">
              <p className="azisb-uname">{userName ?? "User"}</p>
            </div>
            <span className="azisb-uchev">
              <SbChevronUpIcon />
            </span>
          </div>

          {userMenuOpen && (
            <div className="azisb-umenu">
              <div className="azisb-umenu-hd">
                <p className="azisb-umenu-name">{userName ?? "User"}</p>
                {userEmail && <p className="azisb-umenu-email">{userEmail}</p>}
              </div>
              <div className="azisb-umenu-sec">
                <Link
                  href="/profile"
                  className="azisb-umenu-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <SbProfileIcon /> {t.nav_profile}
                </Link>
                <Link
                  href="/friends"
                  className="azisb-umenu-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <SbFriendsIcon />
                  {t.friends_title}
                  {badge > 0 && (
                    <span style={{
                      marginLeft: "auto", minWidth: 18, height: 18, borderRadius: 9,
                      background: "#ef4444", color: "#fff", fontSize: 10,
                      fontWeight: 700, lineHeight: "18px", textAlign: "center",
                      padding: "0 5px", display: "inline-flex", alignItems: "center",
                    }}>{badge}</span>
                  )}
                </Link>
                <Link
                  href="/settings"
                  className="azisb-umenu-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <SbSettingsIcon /> {t.nav_settings}
                </Link>
              </div>
              <div className="azisb-umenu-sec">
                <button
                  className="azisb-umenu-item azisb-umenu-item--danger"
                  onClick={() => {
                    setUserMenuOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                >
                  <SbSignOutIcon /> {t.nav_signOut}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ── CSS ────────────────────────────────────────────────────────────────────────

const CSS = `
/* peakadex Sidebar — desktop only (≥640px) */
.azisb {
  position: fixed;
  left: 0; top: 0;
  height: 100vh;
  width: ${EXPANDED_W}px;
  background: #fff;
  border-right: 1px solid #f0f2f5;
  box-shadow: 2px 0 16px rgba(0,0,0,0.03);
  display: none;
  flex-direction: column;
  z-index: 100;
  transition: width 220ms cubic-bezier(0.4,0,0.2,1);
  overflow: visible;
}
@media (min-width: 640px) { .azisb { display: flex; } }
.azisb--c { width: ${COLLAPSED_W}px; }

/* ── Brand ──────────────────────────────── */
.azisb-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 20px 16px;
  text-decoration: none;
  flex-shrink: 0;
  white-space: nowrap;
}
.azisb--c .azisb-brand { padding: 30px 0 16px; }

/* Show full logo when expanded, icon-only when collapsed. */
.azisb-brand-wrap { display: block; flex-shrink: 0; }
.azisb-logo-text {
  display: inline-block;
  overflow: hidden;
  max-width: 80px;
  opacity: 1;
  transition: max-width 220ms cubic-bezier(0.4,0,0.2,1), opacity 180ms ease, margin 220ms cubic-bezier(0.4,0,0.2,1);
}
.azisb--c .azisb-logo-text {
  max-width: 0;
  opacity: 0;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* ── Nav ────────────────────────────────── */
.azisb-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 24px 16px 0;
}
.azisb-nav {
  padding: 4px 8px;
  margin-top: 48px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

/* ── Nav item ───────────────────────────── */
.azisb-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  height: 44px;
  border-radius: 10px;
  text-decoration: none;
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  color: #64748b;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.01em;
  position: relative;
  transition: background 140ms ease, color 140ms ease;
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
}
.azisb--c .azisb-item { padding: 0; justify-content: center; overflow: visible; }
.azisb-item:hover { background: #f8fafc; color: #0f172a; }
.azisb-item--on { background: #eff6ff; color: #0369a1; }
.azisb-item--on .azisb-lbl { font-weight: 600; }

/* Active pill bar — disabled */
.azisb-item--on::before {
  content: none;
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 3px; height: 22px;
  background: #0369a1;
  border-radius: 0 3px 3px 0;
  transition: opacity 140ms;
}
.azisb--c .azisb-item--on::before { opacity: 0; }

/* ── Icon + label ───────────────────────── */
.azisb-ic {
  width: 20px; height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.azisb-lbl {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  max-width: 180px;
  opacity: 1;
}
/* Expand: labels appear after sidebar widens */
.azisb:not(.azisb--c) .azisb-lbl {
  transition: opacity 150ms ease 180ms, max-width 150ms ease 180ms;
}
/* Collapse: labels disappear immediately */
.azisb--c .azisb-lbl {
  opacity: 0;
  max-width: 0;
  transition: opacity 80ms ease, max-width 80ms ease;
}

/* ── Tooltips (collapsed only) ──────────── */
.azisb--c [data-tip] { position: relative; }
.azisb--c [data-tip]::after {
  content: attr(data-tip);
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  background: #1e293b;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 7px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease 0.35s;
  z-index: 300;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.azisb--c [data-tip]:hover::after { opacity: 1; }


/* ── Footer ─────────────────────────────── */
.azisb-footer {
  padding: 10px 8px;
  margin-top: 48px;
  border-top: 1px solid #f0f2f5;
  position: relative;
  flex-shrink: 0;
}

/* ── User button ────────────────────────── */
.azisb-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  height: 44px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 140ms, padding 220ms cubic-bezier(0.4,0,0.2,1);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
}
.azisb--c .azisb-user { overflow: visible; padding: 0; justify-content: center; gap: 0; }
.azisb-user:hover { background: #f8fafc; }

/* Avatar */
.azisb-avatar {
  width: 32px; height: 32px; min-width: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
  color: #fff;
  font-size: 9px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid rgba(255,255,255,0.8);
  box-shadow: 0 0 0 1.5px #e0e7ef;
  overflow: hidden;
  flex-shrink: 0;
}
.azisb-badge {
  position: absolute; top: -2px; right: -2px;
  min-width: 14px; height: 14px; border-radius: 7px;
  background: #ef4444; color: #fff;
  font-size: 9px; font-weight: 700; line-height: 14px;
  text-align: center; padding: 0 3px; pointer-events: none;
}

/* User info */
.azisb-uinfo {
  flex: 1; min-width: 0; overflow: hidden;
  max-width: 180px; opacity: 1;
}
.azisb:not(.azisb--c) .azisb-uinfo {
  transition: opacity 150ms ease 180ms, max-width 150ms ease 180ms;
}
.azisb--c .azisb-uinfo {
  opacity: 0; max-width: 0; flex: 0;
  transition: opacity 80ms ease, max-width 80ms ease;
}
.azisb-uname {
  font-size: 15px; font-weight: 600; color: #111827;
  margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  line-height: 1;
}
.azisb-uemail {
  font-size: 13px; color: #9ca3af;
  margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.azisb-uchev {
  color: #d1d5db; flex-shrink: 0;
  display: flex; align-items: center;
  max-width: 20px; opacity: 1; overflow: hidden;
}
.azisb:not(.azisb--c) .azisb-uchev {
  transition: opacity 150ms ease 180ms, max-width 150ms ease 180ms;
}
.azisb--c .azisb-uchev {
  opacity: 0; max-width: 0;
  transition: opacity 80ms ease, max-width 80ms ease;
}

/* ── User menu ──────────────────────────── */
.azisb-umenu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 8px; right: 8px;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 14px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06), 0 16px 40px -4px rgba(0,0,0,0.10);
  overflow: hidden;
  z-index: 200;
  animation: aziUmenuIn 0.16s cubic-bezier(0.34,1.56,0.64,1);
}
/* Collapsed: menu to the right */
.azisb--c .azisb-umenu {
  left: calc(100% + 8px);
  right: auto;
  bottom: 0;
  width: 210px;
  animation: aziUmenuInR 0.16s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes aziUmenuIn {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes aziUmenuInR {
  from { opacity: 0; transform: translateX(-8px) scale(0.97); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}
.azisb-umenu-hd { padding: 14px 16px 12px; border-bottom: 1px solid #f3f4f6; }
.azisb-umenu-name { font-size: 13px; font-weight: 600; color: #111827; margin: 0 0 2px; }
.azisb-umenu-email {
  font-size: 11.5px; color: #9ca3af; margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.azisb-umenu-sec { padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
.azisb-umenu-sec:last-child { border-bottom: none; }
.azisb-umenu-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 16px;
  font-size: 13px; font-weight: 500; color: #374151;
  text-decoration: none;
  cursor: pointer; background: none; border: none;
  width: 100%; text-align: left;
  transition: background 0.1s;
}
.azisb-umenu-item:hover { background: #f9fafb; }
.azisb-umenu-item--danger { color: #ef4444; }
.azisb-umenu-item--danger:hover { background: #fef2f2; }
`;

function SbCompassIcon({ on = false }: { on?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 5 L14.5 12 L9.5 12 Z" fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.2 : 0} />
      <path d="M12 5 L14.5 12 L9.5 12 Z" />
      <path d="M12 19 L14.5 12 L9.5 12 Z" />
    </svg>
  );
}

function SbMapIcon({ on = false }: { on?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"
        fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.15 : 0} />
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function SbMountainIcon({ on = false }: { on?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20 L9 8 L13 14 L17 10 L21 20 Z"
        fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.15 : 0} />
      <path d="M3 20 L9 8 L13 14 L17 10 L21 20 Z" />
      <path d="M17 10 L19 7" />
    </svg>
  );
}

function SbPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SbChevronUpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function SbProfileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function SbFriendsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
    </svg>
  );
}

function SbSettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SbSignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
