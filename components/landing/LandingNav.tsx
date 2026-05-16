"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PeakadexLogo } from "@/components/brand/Logo";
import { useLandingT } from "./LandingLocaleContext";

const LANGS = [
  { value: "es", flag: "/flags/es.svg", name: "Español", href: "/" },
  { value: "en", flag: "/flags/en.svg", name: "English", href: "/en" },
  { value: "ca", flag: "/flags/ca.svg", name: "Català",  href: "/ca" },
  { value: "fr", flag: "/flags/fr.svg", name: "Français", href: "/fr" },
  { value: "de", flag: "/flags/de.svg", name: "Deutsch",  href: "/de" },
];

export default function LandingNav() {
  const t = useLandingT();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const locale = t.locale;
  const localePfx = locale === "es" ? "" : `/${locale}`;
  const loginHref    = `${localePfx}/login`;
  const registerHref = `${localePfx}/register`;

  const navLinks = [
    { label: t.nav_rarities, href: "#rarezas" },
    { label: t.nav_cards, href: "#cartas" },
  ];

  useEffect(() => {
    const handler = () => {
      const next = window.scrollY > 60;
      // Functional update avoids re-render when the boolean hasn't changed
      setScrolled((prev) => (prev === next ? prev : next));
    };
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    if (langOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen]);

  const handleAnchor = (href: string) => {
    setMenuOpen(false);
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectLocale = (lang: typeof LANGS[number]) => {
    setLangOpen(false);
    router.push(lang.href);
  };

  const currentLang = LANGS.find((l) => l.value === locale) ?? LANGS[0];

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
          <PeakadexLogo height={30} iconScale={1.1} iconBgColor="white" />
        </Link>

        {/* Desktop nav links */}
        <nav style={{ display: "flex", gap: 4, alignItems: "center" }} className="ld-nav-links">
          {navLinks.map((link) => (
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

        {/* Right side: language selector ↔ CTA (cross-fade) + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

          {/* Wrapper that holds both — language fades out, CTA fades in */}
          <div style={{ position: "relative", height: 38, display: "flex", alignItems: "center" }} className="ld-right-swap">

            {/* Language selector — top of page */}
            <div
              ref={langRef}
              style={{
                opacity: scrolled ? 0 : 1,
                pointerEvents: scrolled ? "none" : "auto",
                transition: "opacity 0.25s ease",
                position: "relative",
              }}
            >
              <button
                onClick={() => setLangOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "none",
                  border: "1px solid rgba(13,37,56,0.15)",
                  borderRadius: 8,
                  padding: "7px 12px",
                  cursor: "pointer",
                  color: "#0D2538",
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "var(--font-space, sans-serif)",
                  transition: "background 0.2s, border-color 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(13,37,56,0.05)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(13,37,56,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "none";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(13,37,56,0.15)";
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentLang.flag} alt={currentLang.name} width={18} height={13} style={{ borderRadius: 2, objectFit: "cover" }} />
                <span className="ld-lang-name">{currentLang.name}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.45, transition: "transform 0.2s", transform: langOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {langOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "#fff",
                    border: "1px solid rgba(13,37,56,0.10)",
                    borderRadius: 12,
                    boxShadow: "0 8px 32px rgba(13,37,56,0.12)",
                    overflow: "hidden",
                    minWidth: 160,
                    zIndex: 100,
                  }}
                >
                  {LANGS.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => selectLocale(lang)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "10px 14px",
                        background: lang.value === locale ? "rgba(13,37,56,0.04)" : "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: lang.value === locale ? 600 : 400,
                        color: lang.value === locale ? "#0D2538" : "rgba(13,37,56,0.75)",
                        fontFamily: "var(--font-space, sans-serif)",
                        textAlign: "left",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (lang.value !== locale)
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(13,37,56,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        if (lang.value !== locale)
                          (e.currentTarget as HTMLButtonElement).style.background = "none";
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={lang.flag} alt={lang.name} width={20} height={15} style={{ borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />
                      {lang.name}
                      {lang.value === locale && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: "auto", color: "#2F7A5F" }}>
                          <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CTA — appears on scroll */}
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: scrolled ? 1 : 0,
                pointerEvents: scrolled ? "auto" : "none",
                transition: "opacity 0.25s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Link
                href={loginHref}
                style={{
                  color: "rgba(13,37,56,0.55)",
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "var(--font-space, sans-serif)",
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
                className="ld-login-link"
              >
                {t.nav_login}
              </Link>
              <Link href={registerHref} className="ld-btn-primary ld-register-btn" style={{ fontSize: 14, padding: "10px 20px" }}>
                {t.nav_register}
              </Link>
            </div>
          </div>

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
          {navLinks.map((link) => (
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

          {/* Language picker in mobile menu */}
          <div style={{ padding: "14px 0 8px", borderBottom: "1px solid rgba(13,37,56,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(13,37,56,0.4)", margin: "0 0 10px" }}>{t.nav_lang}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {LANGS.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => { selectLocale(lang); setMenuOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: `1px solid ${lang.value === locale ? "#2F7A5F" : "rgba(13,37,56,0.12)"}`,
                    background: lang.value === locale ? "rgba(220,38,38,0.06)" : "none",
                    color: lang.value === locale ? "#2F7A5F" : "rgba(13,37,56,0.7)",
                    fontSize: 13,
                    fontWeight: lang.value === locale ? 600 : 400,
                    fontFamily: "var(--font-space, sans-serif)",
                    cursor: "pointer",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lang.flag} alt={lang.name} width={18} height={13} style={{ borderRadius: 2, objectFit: "cover" }} />
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          <Link
            href={registerHref}
            className="ld-btn-primary"
            style={{ marginTop: 12, justifyContent: "center" }}
            onClick={() => setMenuOpen(false)}
          >
            {t.nav_register_mobile}
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 680px) {
          .ld-nav-links  { display: none !important; }
          .ld-login-link { display: none !important; }
          .ld-hamburger  { display: flex !important; }

          /* Keep ld-right-swap visible on mobile — shows lang selector OR CTA on scroll */
          /* Give it a fixed min-width so the absolutely-positioned CTA fits */
          .ld-right-swap { min-width: 96px; }

          /* Hide language name on mobile — show only flag + chevron */
          .ld-lang-name { display: none !important; }

          /* Compact register button on mobile */
          .ld-register-btn { font-size: 12px !important; padding: 8px 14px !important; }
        }
        @media (min-width: 681px) {
          .ld-hamburger { display: none !important; }
        }
        @media (max-width: 900px) and (min-width: 681px) {
          .ld-lang-name { display: none !important; }
        }
      `}</style>
    </header>
  );
}
