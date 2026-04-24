"use client";

import Link from "next/link";

function SpriteIcon({ index, size = 22, active = false }: { index: number; size?: number; active?: boolean }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      backgroundImage: "url('/brand/iconos.png')",
      backgroundSize: `${size}px ${size * 5}px`,
      backgroundPosition: `0 ${-(index * size * 1.25 + size * 0.125)}px`,
      backgroundRepeat: "no-repeat",
      opacity: active ? 1 : 0.5,
      transition: "opacity 150ms ease",
    }} />
  );
}

function PeakadexLogo({ height = 44 }: { height?: number }) {
  const iconSize = height;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/icon.png" alt="" height={iconSize} width={iconSize} style={{ display: "block" }} />
      <span style={{
        fontFamily: "var(--font-baloo2), 'Baloo 2', cursive",
        fontSize: height * 0.75,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: "-0.01em",
      }}>
        <span style={{ color: "#F25A2B" }}>peak</span><span style={{ color: "#0D2538" }}>adex</span>
      </span>
    </div>
  );
}
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useT } from "@/components/providers/I18nProvider";
import { AscentModal } from "@/components/ascents/AscentModal";
import { NewAscentModalContent, type ModalHeaderConfig } from "@/components/ascents/NewAscentModalContent";

type NavBarProps = {
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl?: string | null;
  pendingFriendRequests?: number;
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

export function NavBar({ userName, userEmail, userAvatarUrl, pendingFriendRequests = 0 }: NavBarProps) {
  const pathname = usePathname();
  const t = useT();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ascentModalOpen, setAscentModalOpen] = useState(false);
  const [modalHeader, setModalHeader] = useState<ModalHeaderConfig>({ title: "Nueva ascensión", size: "photo" });
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const ini = initials(userName, userEmail);
  const totalPending = pendingFriendRequests;

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  // Listen for the cross-component event dispatched by Sidebar's + button
  useEffect(() => {
    const handler = () => {
      setAscentModalOpen(true);
      setModalHeader({ title: "Nueva ascensión", size: "photo" });
    };
    document.addEventListener("open-ascent-modal", handler);
    return () => document.removeEventListener("open-ascent-modal", handler);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const tabActive = (href: string) =>
    pendingPath === href || (pendingPath === null && isActive(href));

  function handleTabClick(href: string) {
    setPendingPath(href);
  }

  return (
    <>
      <style>{`
        /* ── Mobile bottom tab bar ───────────────── */
        .bottom-tab-bar {
          display: block;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255,255,255,0.97);
          backdrop-filter: saturate(180%) blur(16px);
          -webkit-backdrop-filter: saturate(180%) blur(16px);
          border-top: 1px solid rgba(0,0,0,0.07);
          z-index: 100;
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
          padding: 8px 4px;
          min-height: 44px;
          color: #b0b8c4;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.15s;
        }
        .tab-item.active { color: #0369a1; }
        .tab-item.active .tab-label { font-weight: 600; }
        .tab-item:active { opacity: 0.65; transform: scale(0.88); transition: transform 0.1s; }
        .tab-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
        }
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
          font-weight: 500;
          letter-spacing: 0.02em;
          line-height: 1;
        }

        /* ── Mobile header ───────────────────────── */
        .mobile-header {
          position: sticky;
          top: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 52px;
          background: rgba(255,255,255,0.97);
          backdrop-filter: saturate(180%) blur(16px);
          -webkit-backdrop-filter: saturate(180%) blur(16px);
          border-bottom: 1px solid rgba(0,0,0,0.07);
        }
        .new-ascent-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          color: #0369a1;
          transition: opacity 0.15s;
          padding: 4px;
        }
        .new-ascent-btn:active { opacity: 0.5; }

        /* ── Mobile bottom sheet ─────────────────── */
        .mobile-sheet-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0,0,0,0.45);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .mobile-sheet {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-radius: 20px 20px 0 0;
          padding-bottom: env(safe-area-inset-bottom);
          animation: sheetUp 0.28s cubic-bezier(0.32, 0.72, 0, 1);
          overflow: hidden;
        }
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .sheet-handle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: #e5e7eb;
          margin: 12px auto 4px;
        }
        .sheet-user {
          padding: 12px 20px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .sheet-name {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 2px;
        }
        .sheet-email {
          font-size: 13px;
          color: #9ca3af;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sheet-section {
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .sheet-section:last-child { border-bottom: none; }
        .sheet-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          font-size: 15px;
          font-weight: 500;
          color: #111827;
          text-decoration: none;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .sheet-item:active { background: #f9fafb; }
        .sheet-item.danger { color: #ef4444; }
        .sheet-item.danger:active { background: #fef2f2; }
        .sheet-item-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sheet-item.danger .sheet-item-icon {
          background: #fef2f2;
        }

        /* ── Responsive show/hide ────────────────── */
        @media (min-width: 640px) {
          .bottom-tab-bar { display: none !important; }
          .mobile-header { display: none !important; }
          .mobile-sheet-backdrop { display: none !important; }
        }
      `}</style>

      {/* ── MOBILE HEADER ───────────────────────────────────────────────────── */}
      <header className="mobile-header">
        <button
          className="new-ascent-btn"
          aria-label="Nueva ascensión"
          onClick={() => { setAscentModalOpen(true); setModalHeader({ title: "Nueva ascensión", size: "photo" }); }}
        >
          <PlusIcon />
        </button>

        <Link href="/map" style={{
          position: "absolute", left: "50%", transform: "translateX(calc(-50% - 3vw))",
          display: "flex", alignItems: "center", textDecoration: "none",
        }}>
          <PeakadexLogo height={34} />
        </Link>

        <div
          onClick={() => setMobileMenuOpen(true)}
          role="button"
          aria-label="Profile menu"
          style={{ position: "relative", cursor: "pointer" }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
            color: "white", fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid rgba(255,255,255,0.8)",
            boxShadow: "0 0 0 1.5px #e0e7ef",
            overflow: "hidden",
          }}>
            {userAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : ini}
          </div>
          {totalPending > 0 && (
            <span style={{
              position: "absolute", top: -2, right: -2,
              minWidth: 14, height: 14, borderRadius: 7,
              background: "#ef4444", color: "white",
              fontSize: 9, fontWeight: 700, lineHeight: "14px",
              textAlign: "center", padding: "0 3px", pointerEvents: "none",
            }}>{totalPending}</span>
          )}
        </div>
      </header>

      {/* ── MOBILE BOTTOM SHEET ──────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="mobile-sheet-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-user">
              <p className="sheet-name">{userName ?? "User"}</p>
              {userEmail && <p className="sheet-email">{userEmail}</p>}
            </div>
            <div className="sheet-section">
              <Link href="/profile" className="sheet-item" onClick={() => setMobileMenuOpen(false)}>
                <span className="sheet-item-icon"><ProfileIcon size={18} /></span>
                {t.nav_profile}
              </Link>
              <Link href="/friends" className="sheet-item" onClick={() => setMobileMenuOpen(false)} style={{ position: "relative" }}>
                <span className="sheet-item-icon" style={{ position: "relative" }}>
                  <FriendsIcon size={18} />
                  {totalPending > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      minWidth: 14, height: 14, borderRadius: 7,
                      background: "#ef4444", color: "white",
                      fontSize: 9, fontWeight: 700, lineHeight: "14px",
                      textAlign: "center", padding: "0 3px",
                    }}>{totalPending}</span>
                  )}
                </span>
                {t.friends_title}
                {totalPending > 0 && (
                  <span style={{
                    marginLeft: "auto", minWidth: 20, height: 20, borderRadius: 10,
                    background: "#ef4444", color: "white",
                    fontSize: 11, fontWeight: 700, lineHeight: "20px",
                    textAlign: "center", padding: "0 5px",
                  }}>{totalPending}</span>
                )}
              </Link>
              <Link href="/settings" className="sheet-item" onClick={() => setMobileMenuOpen(false)}>
                <span className="sheet-item-icon"><SettingsIcon size={18} /></span>
                {t.nav_settings}
              </Link>
            </div>
            <div className="sheet-section">
              <button
                className="sheet-item danger"
                onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: "/login" }); }}
              >
                <span className="sheet-item-icon"><SignOutIcon size={18} /></span>
                {t.nav_signOut}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW ASCENT MODAL ─────────────────────────────────────────────────── */}
      <AscentModal
        open={ascentModalOpen}
        onClose={() => setAscentModalOpen(false)}
        title={modalHeader.title}
        leftAction={modalHeader.leftAction}
        rightAction={modalHeader.rightAction}
        size={modalHeader.size ?? "split"}
      >
        {ascentModalOpen && (
          <NewAscentModalContent
            onClose={() => setAscentModalOpen(false)}
            onHeaderChange={setModalHeader}
          />
        )}
      </AscentModal>

      {/* ── MOBILE BOTTOM TAB BAR ────────────────────────────────────────────── */}
      <nav className="bottom-tab-bar" aria-label="Main navigation">
        <div className="tab-inner">
          <Link href="/home" className={`tab-item${tabActive("/home") ? " active" : ""}`} onClick={() => handleTabClick("/home")}>
            <div className="tab-icon-wrap">
              <SpriteIcon index={0} size={26} active={tabActive("/home")} />
            </div>
            <span className="tab-label">{t.nav_home}</span>
          </Link>
          <Link href="/map" className={`tab-item${tabActive("/map") ? " active" : ""}`} onClick={() => handleTabClick("/map")}>
            <div className="tab-icon-wrap">
              <SpriteIcon index={1} size={26} active={tabActive("/map")} />
            </div>
            <span className="tab-label">{t.nav_map}</span>
          </Link>
          <Link href="/ascents" className={`tab-item${tabActive("/ascents") ? " active" : ""}`} onClick={() => handleTabClick("/ascents")}>
            <div className="tab-icon-wrap">
              <SpriteIcon index={2} size={26} active={tabActive("/ascents")} />
            </div>
            <span className="tab-label">{t.nav_ascents}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function CompassIcon({ size = 18, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
      stroke="currentColor" strokeWidth={active ? 2 : 1.8}>
      <circle cx="12" cy="12" r="9" />
      {active ? (
        <>
          <path d="M12 5 L14.5 12 L9.5 12 Z" fill="currentColor" opacity="0.15" />
          <path d="M12 5 L14.5 12 L9.5 12 Z" />
          <path d="M12 19 L14.5 12 L9.5 12 Z" />
        </>
      ) : (
        <>
          <path d="M12 5 L14.5 12 L9.5 12 Z" />
          <path d="M12 19 L14.5 12 L9.5 12 Z" />
        </>
      )}
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

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function FriendsIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
    </svg>
  );
}

function ProfileIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function SettingsIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SignOutIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
