"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PeakadexLogo } from "@/components/brand/Logo";

const NAV_LINKS = [
  { label: "Rarezas", href: "#rarezas" },
  { label: "Cartas", href: "#cartas" },
  { label: "Cómo funciona", href: "#como-funciona" },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        hamburgerRef.current && !hamburgerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleAnchor = (href: string) => {
    setMenuOpen(false);
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: "background 0.3s, backdrop-filter 0.3s, border-bottom 0.3s",
        background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(13,37,56,0.08)" : "none",
      }}
    >
      <div
        className="ld-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <PeakadexLogo
            height={30}
            iconScale={1.1}
            iconBgColor="white"
          />
        </Link>

        {/* Desktop nav links */}
        <nav
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
          }}
          className="ld-nav-links"
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => handleAnchor(link.href)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(13,37,56,0.65)",
                fontFamily: "var(--font-space, sans-serif)",
                fontSize: 14,
                fontWeight: 500,
                padding: "8px 14px",
                borderRadius: 8,
                cursor: "pointer",
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#0D2538";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(13,37,56,0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(13,37,56,0.65)";
                (e.currentTarget as HTMLButtonElement).style.background = "none";
              }}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/login"
            style={{
              color: "rgba(13,37,56,0.55)",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "var(--font-space, sans-serif)",
              textDecoration: "none",
              padding: "8px 12px",
              borderRadius: 8,
              transition: "color 0.2s",
            }}
            className="ld-login-link"
          >
            Iniciar sesión
          </Link>
          <Link href="/register" className="ld-btn-primary ld-register-btn" style={{ fontSize: 14, padding: "10px 20px" }}>
            Registrarse
          </Link>

          {/* Mobile hamburger */}
          <button
            ref={hamburgerRef}
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              display: "none",
              background: "none",
              border: "none",
              color: "#0D2538",
              cursor: "pointer",
              padding: 8,
              marginLeft: 4,
            }}
            className="ld-hamburger"
            aria-label="Menú"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {menuOpen ? (
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              ) : (
                <path d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(13,37,56,0.08)",
            padding: "12px 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => handleAnchor(link.href)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(13,37,56,0.8)",
                fontFamily: "var(--font-space, sans-serif)",
                fontSize: 16,
                fontWeight: 500,
                padding: "12px 0",
                textAlign: "left",
                cursor: "pointer",
                borderBottom: "1px solid rgba(13,37,56,0.06)",
              }}
            >
              {link.label}
            </button>
          ))}
          <Link
            href="/register"
            className="ld-btn-primary"
            style={{ marginTop: 12, justifyContent: "center" }}
            onClick={() => setMenuOpen(false)}
          >
            Registrarse gratis
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 680px) {
          .ld-nav-links { display: none !important; }
          .ld-login-link { display: none !important; }
          .ld-hamburger { display: flex !important; }
          .ld-register-btn { font-size: 12px !important; padding: 8px 14px !important; }
        }
        @media (min-width: 681px) {
          .ld-hamburger { display: none !important; }
        }
      `}</style>
    </header>
  );
}
