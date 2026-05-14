"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { PeakadexLogo } from "@/components/brand/Logo";

// index 0 = Home (compass), 1 = Map (atlas), 2 = Ascents (history)
function SpriteIcon({ index, size = 20, active = false }: { index: number; size?: number; active?: boolean }) {
  const opacity = active ? 1 : 0.45;
  const style: React.CSSProperties = { transition: "opacity 150ms ease", opacity, flexShrink: 0 };

  if (index === 0) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <circle cx="12" cy="12" r="8.5" stroke="#0F2233" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="3" r="1.4" fill="#E53935" stroke="#0F2233" strokeWidth="1.5"/>
      <path d="M15.9 7.8L13.5 14.1L8.1 16.2L10.5 9.9L15.9 7.8Z" stroke="#0F2233" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M15.9 7.8L13.5 14.1L11.9 12.1L15.9 7.8Z" fill="#E53935"/>
      <path d="M8.1 16.2L10.5 9.9L12.1 11.9L8.1 16.2Z" fill="#CBD5E1"/>
    </svg>
  );

  if (index === 1) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path d="M3.5 5.5L8.5 3.5L15.5 6.2L20.5 4.2V18.5L15.5 20.5L8.5 17.8L3.5 19.8V5.5Z" stroke="#0F2233" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M8.5 3.5V17.8" stroke="#0F2233" strokeWidth="2" strokeLinecap="round"/>
      <path d="M15.5 6.2V20.5" stroke="#0F2233" strokeWidth="2" strokeLinecap="round"/>
      <path d="M6.5 14.5C8.2 12.8 9.6 12.1 11.2 13.1C12.8 14.1 13.6 13.8 15 12.4" stroke="#0F2233" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2.5 2.5"/>
      <circle cx="17.2" cy="10.2" r="1.4" fill="#E53935" stroke="#0F2233" strokeWidth="1.5"/>
    </svg>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path d="M3.5 13.5L8.6 7.2L12 11.3L14.3 8.5L20.5 16.5H3.5V13.5Z" stroke="#0F2233" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M4.5 16.5H20.5L17.7 13.1L15.8 15.2L12 11.3L9.2 14.7L7.6 12.8L4.5 16.5Z" fill="#64748B"/>
      <circle cx="5" cy="20" r="1" fill="#0F2233"/>
      <path d="M9 20H20" stroke="#0F2233" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="5" cy="23" r="1" fill="#0F2233"/>
      <path d="M9 23H17" stroke="#0F2233" strokeWidth="2" strokeLinecap="round"/>
    </svg>
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
  unseenFeedCount?: number;
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
  unseenFeedCount = 0,
}: Props) {
  const pathname = usePathname();
  const t = useT();
  const [hovered, setHovered] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [liveFeedCount, setLiveFeedCount] = useState(unseenFeedCount);
  const menuRef = useRef<HTMLDivElement>(null);
  const abbr = getInitials(userName, userEmail);
  const badge = pendingFriendRequests;

  useEffect(() => {
    const handler = (e: Event) => {
      const delta = (e as CustomEvent<{ delta: number }>).detail.delta;
      setLiveFeedCount((prev) => Math.max(0, prev + delta));
    };
    document.addEventListener("unseen-feed-count-changed", handler);
    return () => document.removeEventListener("unseen-feed-count-changed", handler);
  }, []);

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
            <PeakadexLogo height={32} iconScale={1.21} peakClassName="azisb-logo-text azisb-logo-peak" adexClassName="azisb-logo-text azisb-logo-adex" />
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
            <span className="azisb-ic" style={{ position: "relative" }}>
              <SpriteIcon index={2} size={28} active={active("/ascents")} />
              {liveFeedCount > 0 && (
                <span style={{
                  position: "absolute", top: 0, right: -2,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: "#ef4444", color: "#fff",
                  fontSize: 9, fontWeight: 700, lineHeight: "16px",
                  textAlign: "center", padding: "0 3px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {liveFeedCount > 99 ? "99+" : liveFeedCount}
                </span>
              )}
            </span>
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

          {/* Avatar → Profile (last nav item, like Instagram) */}
          <Link
            href="/profile"
            className={`azisb-item${active("/profile") ? " azisb-item--on" : ""}`}
            data-tip={t.nav_profile}
          >
            <span className="azisb-ic">
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
            </span>
            <span className="azisb-lbl">{userName ?? t.nav_profile}</span>
          </Link>
        </nav>

        {/* ── Footer — hamburger only, anchored to bottom ─────────────── */}
        <div className="azisb-footer" ref={menuRef}>

          {/* Hamburger → Settings + Sign out */}
          <button
            className="azisb-item"
            data-tip="Más"
            onClick={() => setUserMenuOpen((o) => !o)}
            aria-label="Más opciones"
            aria-expanded={userMenuOpen}
          >
            <span className="azisb-ic"><SbHamburgerIcon /></span>
            <span className="azisb-lbl">Más</span>
          </button>

          {userMenuOpen && (
            <div className="azisb-umenu">
              <div className="azisb-umenu-sec">
                <Link
                  href="/friends"
                  className="azisb-umenu-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <SbFriendsIcon /> {t.friends_title}
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
.azisb--c .azisb-nav { padding: 4px 0; }
.azisb--c .azisb-item { padding: 0; justify-content: center; overflow: visible; gap: 0; }
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
  width: 28px; height: 28px;
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
  margin-top: auto;
  border-top: 1px solid #f0f2f5;
  position: relative;
  flex-shrink: 0;
}

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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.45 }}>
      <path d="M12 5V19" stroke="#0F2233" strokeWidth="2" strokeLinecap="round"/>
      <path d="M5 12H19" stroke="#0F2233" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function SbHamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F2233"
      strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.45 }}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function SbSocialIcon({ active = false }: { active?: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {active && <circle cx="9" cy="7" r="3" fill="currentColor" opacity="0.15" />}
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
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
