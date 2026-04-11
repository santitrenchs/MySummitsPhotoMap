"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";

type NavBarProps = {
  userName: string | null;
  userEmail: string | null;
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

const NAV_LINKS = [
  { href: "/map", label: "Map", desktopIcon: <MapIcon />, mobileIcon: <MapIcon /> },
  { href: "/ascents", label: "Ascents", desktopIcon: <MountainIcon />, mobileIcon: <MountainIcon /> },
  { href: "/persons", label: "People", desktopIcon: <PeopleIcon />, mobileIcon: <PeopleIcon /> },
];

export function NavBar({ userName, userEmail }: NavBarProps) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const ini = initials(userName, userEmail);

  // Close dropdown on outside click
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
        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 4px;
          height: 56px;
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          text-decoration: none;
          border-bottom: 2px solid transparent;
          transition: color 0.15s;
        }
        .nav-link:hover { color: #111827; }
        .nav-link.active {
          color: #0369a1;
          border-bottom-color: #0369a1;
        }
        .avatar-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
          color: white;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 0 0 1.5px #e5e7eb;
          user-select: none;
          transition: box-shadow 0.15s;
        }
        .avatar-btn:hover { box-shadow: 0 0 0 2px #0369a1; }
        .dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          min-width: 180px;
          overflow: hidden;
          z-index: 200;
        }
        .dropdown-user {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .dropdown-name {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 2px;
        }
        .dropdown-email {
          font-size: 11px;
          color: #9ca3af;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 16px;
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
        }
        .dropdown-item:hover { background: #f9fafb; }
        .dropdown-item.danger { color: #dc2626; }
        .dropdown-item.danger:hover { background: #fef2f2; }

        /* Mobile bottom tab bar */
        .bottom-tab-bar {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(60px + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid #e5e7eb;
          z-index: 100;
        }
        .tab-inner {
          display: flex;
          align-items: center;
          height: 60px;
        }
        .tab-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          text-decoration: none;
          padding: 6px 0;
          color: #9ca3af;
          transition: color 0.15s;
        }
        .tab-item.active { color: #0369a1; }
        .tab-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.01em;
        }
        .tab-plus {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 0;
        }
        .tab-plus-btn {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 12px rgba(3,105,161,0.45);
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
          margin-top: -8px;
        }
        .tab-plus-btn:active {
          transform: scale(0.94);
          box-shadow: 0 1px 6px rgba(3,105,161,0.35);
        }

        @media (max-width: 639px) {
          .desktop-nav { display: none !important; }
          .bottom-tab-bar { display: flex; flex-direction: column; justify-content: flex-end; }
        }
        @media (min-width: 640px) {
          .bottom-tab-bar { display: none; }
        }
      `}</style>

      {/* ── DESKTOP TOP NAV ───────────────────────────────────────────────── */}
      <header className="desktop-nav" style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 56,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        paddingLeft: 24,
        paddingRight: 24,
        gap: 0,
      }}>
        {/* Logo */}
        <Link href="/map" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginRight: 32 }}>
          <LogoIcon />
          <span style={{ fontSize: 15, fontWeight: 800, color: "#0369a1", letterSpacing: "-0.02em" }}>MySummits</span>
        </Link>

        {/* Center nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={`nav-link${isActive(href) ? " active" : ""}`}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: avatar + dropdown */}
        <div ref={avatarRef} style={{ marginLeft: "auto", position: "relative" }}>
          <div className="avatar-btn" onClick={() => setDropdownOpen((o) => !o)}>
            {ini}
          </div>
          {dropdownOpen && (
            <div className="dropdown">
              <div className="dropdown-user">
                <p className="dropdown-name">{userName ?? "User"}</p>
                {userEmail && <p className="dropdown-email">{userEmail}</p>}
              </div>
              <button
                className="dropdown-item danger"
                onClick={() => { setDropdownOpen(false); signOut({ callbackUrl: "/login" }); }}
              >
                <SignOutIcon /> Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── MOBILE BOTTOM TAB BAR ─────────────────────────────────────────── */}
      <nav className="bottom-tab-bar">
        <div className="tab-inner">
          {/* Map */}
          <Link href="/map" className={`tab-item${isActive("/map") ? " active" : ""}`}>
            <MapIcon size={22} />
            <span className="tab-label">Map</span>
          </Link>

          {/* Ascents */}
          <Link href="/ascents" className={`tab-item${isActive("/ascents") ? " active" : ""}`}>
            <MountainIcon size={22} />
            <span className="tab-label">Ascents</span>
          </Link>

          {/* + New ascent (center primary action) */}
          <div className="tab-plus">
            <Link href="/ascents/new" className="tab-plus-btn" aria-label="New ascent">
              <PlusIcon />
            </Link>
          </div>

          {/* People */}
          <Link href="/persons" className={`tab-item${isActive("/persons") ? " active" : ""}`}>
            <PeopleIcon size={22} />
            <span className="tab-label">People</span>
          </Link>

          {/* Profile (sign out via dropdown in desktop; on mobile shows initials → sign out) */}
          <MobileProfileTab ini={ini} userName={userName} userEmail={userEmail} />
        </div>
      </nav>
    </>
  );
}

function MobileProfileTab({ ini, userName, userEmail }: { ini: string; userName: string | null; userEmail: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="tab-item" style={{ position: "relative", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%",
        background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
        color: "white", fontSize: 11, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {ini}
      </div>
      <span className="tab-label" style={{ color: "inherit" }}>Profile</span>

      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          right: 0,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
          minWidth: 190,
          overflow: "hidden",
          zIndex: 200,
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>{userName ?? "User"}</p>
            {userEmail && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{userEmail}</p>}
          </div>
          <button
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 16px",
              fontSize: 13, fontWeight: 500, color: "#dc2626",
              background: "none", border: "none", width: "100%", textAlign: "left",
              cursor: "pointer",
            }}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <SignOutIcon /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function LogoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18 L8 8 L12 14 L16 10 L21 18 Z" />
      <path d="M16 10 L18 7 L21 10" strokeWidth="1.5" />
    </svg>
  );
}

function MapIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function MountainIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20 L9 8 L13 14 L17 10 L21 20 Z" />
      <path d="M17 10 L19 7" />
    </svg>
  );
}

function PeopleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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
