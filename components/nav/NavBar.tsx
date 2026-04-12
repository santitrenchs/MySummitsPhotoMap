"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useT } from "@/components/providers/I18nProvider";

type NavBarProps = {
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl?: string | null;
  pendingFriendRequests?: number;
  pendingTagCount?: number;
};

function initials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name[0]?.toUpperCase() ?? "U";
  }
  if (email) return email[0]?.toUpperCase() ?? "U";
  return "U";
}

export function NavBar({ userName, userEmail, userAvatarUrl, pendingFriendRequests = 0, pendingTagCount = 0 }: NavBarProps) {
  const pathname = usePathname();
  const t = useT();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const ini = initials(userName, userEmail);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handle(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dropdownOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <style>{`
        /* ── Desktop nav ─────────────────────────── */
        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          padding: 0 10px;
          height: 48px;
          font-size: 13.5px;
          font-weight: 500;
          color: #6b7280;
          text-decoration: none;
          letter-spacing: -0.01em;
          transition: color 0.15s;
          border-radius: 8px;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 10px;
          right: 10px;
          height: 1.5px;
          border-radius: 2px;
          background: #0369a1;
          transform: scaleX(0);
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: center;
        }
        .nav-link:hover {
          color: #111827;
          background: #f5f5f5;
        }
        .nav-link.active {
          color: #0369a1;
          font-weight: 600;
        }
        .nav-link.active::after {
          transform: scaleX(1);
        }

        /* Avatar */
        .avatar-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
          color: white;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1.5px solid rgba(255,255,255,0.8);
          box-shadow: 0 0 0 1.5px #e0e7ef;
          user-select: none;
          transition: box-shadow 0.15s, transform 0.12s;
        }
        .avatar-btn:hover {
          box-shadow: 0 0 0 2px #0369a1;
          transform: scale(1.05);
        }

        /* Dropdown */
        .dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          background: white;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 14px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 16px 40px -4px rgba(0,0,0,0.12);
          min-width: 192px;
          overflow: hidden;
          z-index: 200;
          animation: dropIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dropdown-user {
          padding: 14px 16px 12px;
          border-bottom: 1px solid #f3f4f6;
        }
        .dropdown-name {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 2px;
        }
        .dropdown-email {
          font-size: 11.5px;
          color: #9ca3af;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dropdown-section {
          padding: 6px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .dropdown-section:last-child { border-bottom: none; }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          text-decoration: none;
          cursor: pointer;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          transition: background 0.1s;
          border-radius: 0;
        }
        .dropdown-item:hover { background: #f9fafb; }
        .dropdown-item.muted { color: #9ca3af; cursor: default; }
        .dropdown-item.muted:hover { background: none; }
        .dropdown-item.danger { color: #ef4444; }
        .dropdown-item.danger:hover { background: #fef2f2; }
        .coming-soon {
          font-size: 9.5px;
          font-weight: 600;
          color: #d1d5db;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-left: auto;
          padding: 2px 6px;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
        }

        /* ── Mobile bottom tab bar ───────────────── */
        .bottom-tab-bar {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255,255,255,0.97);
          backdrop-filter: saturate(180%) blur(16px);
          -webkit-backdrop-filter: saturate(180%) blur(16px);
          border-top: 1px solid rgba(0,0,0,0.07);
          z-index: 100;
          /* Safe area */
          padding-bottom: env(safe-area-inset-bottom);
        }
        .tab-inner {
          display: flex;
          align-items: center;
          height: 62px;
        }
        .tab-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          text-decoration: none;
          /* Minimum 44px tap target via padding */
          padding: 8px 4px;
          min-height: 44px;
          color: #b0b8c4;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.15s;
        }
        .tab-item.active { color: #0369a1; }
        .tab-item:active { opacity: 0.65; }
        .tab-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
        }
        /* Active dot indicator */
        .tab-item.active .tab-icon-wrap::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #0369a1;
        }
        .tab-label {
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          line-height: 1;
        }

        /* Central + button */
        .tab-plus-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tab-plus-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(145deg, #0284c7 0%, #0369a1 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 0 0 4px rgba(3,105,161,0.10),
            0 4px 16px rgba(3,105,161,0.50),
            0 1px 3px rgba(0,0,0,0.15);
          text-decoration: none;
          margin-top: -14px;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s;
        }
        .tab-plus-btn:active {
          transform: scale(0.90);
          box-shadow:
            0 0 0 4px rgba(3,105,161,0.08),
            0 2px 8px rgba(3,105,161,0.35),
            0 1px 2px rgba(0,0,0,0.1);
        }

        /* Responsive show/hide */
        @media (max-width: 639px) {
          .desktop-nav { display: none !important; }
          .bottom-tab-bar { display: block; }
        }
        @media (min-width: 640px) {
          .bottom-tab-bar { display: none; }
        }
      `}</style>

      {/* ── DESKTOP TOP NAV ──────────────────────────────────────────────────── */}
      <header className="desktop-nav" style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 48,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "saturate(180%) blur(8px)",
        WebkitBackdropFilter: "saturate(180%) blur(8px)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.07)",
        display: "flex",
        alignItems: "center",
        paddingLeft: 20,
        paddingRight: 20,
      }}>
        {/* Logo */}
        <Link href="/map" style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", marginRight: 24, flexShrink: 0 }}>
          <LogoIcon />
          <span style={{ fontSize: 14, fontWeight: 800, color: "#0369a1", letterSpacing: "-0.03em" }}>MySummits</span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Link href="/home" className={`nav-link${isActive("/home") ? " active" : ""}`}>{t.nav_home}</Link>
          <Link href="/map" className={`nav-link${isActive("/map") ? " active" : ""}`}>{t.nav_map}</Link>
          <Link href="/ascents" className={`nav-link${isActive("/ascents") ? " active" : ""}`}>{t.nav_ascents}</Link>
          <Link href="/social" className={`nav-link${isActive("/social") ? " active" : ""}`}>{t.nav_people}</Link>
        </nav>

        {/* Avatar + dropdown */}
        <div ref={avatarRef} style={{ marginLeft: "auto", position: "relative" }}>
          <div
            className="avatar-btn"
            onClick={() => setDropdownOpen((o) => !o)}
            role="button"
            aria-label="Profile menu"
            aria-expanded={dropdownOpen}
            style={{ position: "relative", overflow: "hidden", padding: 0 }}
          >
            {userAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : ini}
            {(pendingFriendRequests + pendingTagCount) > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2,
                minWidth: 14, height: 14, borderRadius: 7,
                background: "#ef4444", color: "white",
                fontSize: 9, fontWeight: 700, lineHeight: "14px",
                textAlign: "center", padding: "0 3px", pointerEvents: "none",
              }}>{pendingFriendRequests + pendingTagCount}</span>
            )}
          </div>

          {dropdownOpen && (
            <div className="dropdown">
              {/* User info */}
              <div className="dropdown-user">
                <p className="dropdown-name">{userName ?? "User"}</p>
                {userEmail && <p className="dropdown-email">{userEmail}</p>}
              </div>

              {/* Nav items */}
              <div className="dropdown-section">
                <Link
                  href="/profile"
                  className="dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <ProfileIcon />
                  {t.nav_profile}
                </Link>
                <Link
                  href="/friends"
                  className="dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                  style={{ position: "relative" }}
                >
                  <FriendsIcon />
                  {t.friends_title}
                  {(pendingFriendRequests + pendingTagCount) > 0 && (
                    <span style={{
                      marginLeft: "auto",
                      minWidth: 18, height: 18, borderRadius: 9,
                      background: "#ef4444", color: "white",
                      fontSize: 10, fontWeight: 700, lineHeight: "18px",
                      textAlign: "center", padding: "0 5px",
                    }}>{pendingFriendRequests + pendingTagCount}</span>
                  )}
                </Link>
                <Link
                  href="/settings"
                  className="dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <SettingsIcon />
                  {t.nav_settings}
                </Link>
              </div>

              {/* Sign out */}
              <div className="dropdown-section">
                <button
                  className="dropdown-item danger"
                  onClick={() => { setDropdownOpen(false); signOut({ callbackUrl: "/login" }); }}
                >
                  <SignOutIcon /> {t.nav_signOut}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── MOBILE BOTTOM TAB BAR ────────────────────────────────────────────── */}
      <nav className="bottom-tab-bar" aria-label="Main navigation">
        <div className="tab-inner">

          <Link href="/home" className={`tab-item${isActive("/home") ? " active" : ""}`}>
            <div className="tab-icon-wrap">
              <HomeIcon size={22} active={isActive("/home")} />
            </div>
            <span className="tab-label">{t.nav_home}</span>
          </Link>

          <Link href="/map" className={`tab-item${isActive("/map") ? " active" : ""}`}>
            <div className="tab-icon-wrap">
              <MapIcon size={22} active={isActive("/map")} />
            </div>
            <span className="tab-label">{t.nav_map}</span>
          </Link>

          {/* Central + button */}
          <div className="tab-plus-wrap">
            <Link href="/ascents/new" className="tab-plus-btn" aria-label={t.nav_logAscent}>
              <PlusIcon />
            </Link>
          </div>

          <Link href="/ascents" className={`tab-item${isActive("/ascents") ? " active" : ""}`}>
            <div className="tab-icon-wrap">
              <MountainIcon size={22} active={isActive("/ascents")} />
            </div>
            <span className="tab-label">{t.nav_ascents}</span>
          </Link>

          <Link href="/social" className={`tab-item${isActive("/social") ? " active" : ""}`}>
            <div className="tab-icon-wrap">
              <PeopleIcon size={22} active={isActive("/social")} />
            </div>
            <span className="tab-label">{t.nav_people}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}

// ── Mobile profile tab ─────────────────────────────────────────────────────────

function MobileProfileTab({ ini, avatarUrl }: { ini: string; avatarUrl: string | null }) {
  const t = useT();
  const pathname = usePathname();

  return (
    <Link
      href="/profile"
      className={`tab-item${pathname.startsWith("/profile") ? " active" : ""}`}
    >
      <div className="tab-icon-wrap">
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
          color: "white", fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 0 1.5px rgba(3,105,161,0.3)",
          overflow: "hidden",
        }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : ini}
        </div>
      </div>
      <span className="tab-label">{t.nav_profile}</span>
    </Link>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function HomeIcon({ size = 18, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
      stroke="currentColor" strokeWidth={active ? 2 : 1.8}>
      {active
        ? <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" fill="currentColor" opacity="0.15" /><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" /></>
        : <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" /></>
      }
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 19 L8.5 7 L13 14 L17 9.5 L21 19 Z" fill="#dbeafe" stroke="#0369a1" strokeWidth="1.8" />
      <path d="M17 9.5 L19 6.5" stroke="#0369a1" strokeWidth="1.8" />
      <circle cx="19" cy="6" r="1.2" fill="#0369a1" />
    </svg>
  );
}

function MapIcon({ size = 18, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
      stroke="currentColor" strokeWidth={active ? 2 : 1.8}>
      {active ? (
        <>
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" fill="currentColor" opacity="0.15" />
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </>
      ) : (
        <>
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </>
      )}
    </svg>
  );
}

function MountainIcon({ size = 18, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
      stroke="currentColor" strokeWidth={active ? 2 : 1.8}>
      {active ? (
        <>
          <path d="M3 20 L9 8 L13 14 L17 10 L21 20 Z" fill="currentColor" opacity="0.15" />
          <path d="M3 20 L9 8 L13 14 L17 10 L21 20 Z" />
          <path d="M17 10 L19 7" />
        </>
      ) : (
        <>
          <path d="M3 20 L9 8 L13 14 L17 10 L21 20 Z" />
          <path d="M17 10 L19 7" />
        </>
      )}
    </svg>
  );
}

function PeopleIcon({ size = 18, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
      stroke="currentColor" strokeWidth={active ? 2 : 1.8}>
      <circle cx="9" cy="7" r="3" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
