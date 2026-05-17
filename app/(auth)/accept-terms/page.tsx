"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";
import { PeakadexLogo } from "@/components/brand/Logo";

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  navy:       "#0D2538",
  navyMid:    "#5A6E84",
  navyLight:  "#94A3B8",
  navyFaint:  "#B8C5D0",
  border:     "#E8EBEE",
  green:      "#2F7A5F",
  greenHover: "#256650",
  pageBg:     "#EDEEF0",
  cardBg:     "#F6F7F5",
} as const;

export default function AcceptTermsPage() {
  const router  = useRouter();
  const t       = useT();

  const [accepted,   setAccepted]   = useState(false);
  const [marketing,  setMarketing]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const isDisabled = !accepted || saving;

  async function handleAccept() {
    if (!accepted) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketing }),
      });
      if (!res.ok) throw new Error("failed");
      router.replace("/home");
    } catch {
      setError("Error al guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  return (
    <div style={{
      minHeight: "100svh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: C.pageBg,
      padding: "24px 16px",
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: C.cardBg,
        borderRadius: "var(--radius-xl)",
        border: `1px solid ${C.border}`,
        boxShadow: "0 8px 40px rgba(13,37,56,0.11), 0 1px 4px rgba(13,37,56,0.06)",
        padding: "40px 32px 36px",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <PeakadexLogo height={38} iconScale={1.0} />
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 21, fontWeight: 800, color: C.navy, margin: "0 0 10px", textAlign: "center", letterSpacing: "-0.3px" }}>
          {t.auth_accept_title}
        </h1>
        <p style={{ fontSize: 14, color: C.navyMid, margin: "0 0 32px", textAlign: "center", lineHeight: 1.65 }}>
          {t.auth_accept_subtitle}
        </p>

        {/* Checkboxes */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
          {/* Required */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 11, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => { setAccepted(e.target.checked); setError(null); }}
              style={{ marginTop: 2, accentColor: C.green, flexShrink: 0, width: 16, height: 16, cursor: "pointer" }}
            />
            <span style={{ fontSize: 13.5, color: C.navy, lineHeight: 1.55, fontWeight: 500 }}>
              {t.auth_legal_required.split("{terms}")[0]}
              <Link href="/terms" target="_blank" rel="noopener noreferrer"
                style={{ color: C.green, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}
              >{t.auth_legal_terms}</Link>
              {t.auth_legal_required.split("{terms}")[1]?.split("{privacy}")[0]}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer"
                style={{ color: C.green, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}
              >{t.auth_legal_privacy}</Link>
              {t.auth_legal_required.split("{privacy}")[1]}
            </span>
          </label>

          {/* Optional marketing */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 11, cursor: "pointer", marginTop: 20, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              style={{ marginTop: 2, accentColor: C.green, flexShrink: 0, width: 15, height: 15, cursor: "pointer" }}
            />
            <span style={{ fontSize: 12.5, color: C.navyFaint, lineHeight: 1.55 }}>
              {t.auth_legal_marketing}
            </span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 13, color: "#dc2626",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 18,
          }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleAccept}
          disabled={isDisabled}
          style={{
            width: "100%", padding: "14px 16px",
            background: C.green,
            color: "#fff",
            border: "none", borderRadius: "var(--radius-lg)",
            fontSize: 15, fontWeight: 700,
            cursor: isDisabled ? "not-allowed" : "pointer",
            opacity: isDisabled ? 0.42 : 1,
            boxShadow: isDisabled ? "none" : "0 2px 12px rgba(47,122,95,0.22)",
            transition: "opacity 0.2s, box-shadow 0.2s, background 0.2s",
            fontFamily: "var(--font-inter, sans-serif)",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => { if (!isDisabled) { const b = e.currentTarget; b.style.background = C.greenHover; b.style.boxShadow = "0 4px 16px rgba(47,122,95,0.28)"; } }}
          onMouseLeave={(e) => { if (!isDisabled) { const b = e.currentTarget; b.style.background = C.green; b.style.boxShadow = "0 2px 12px rgba(47,122,95,0.22)"; } }}
        >
          {saving ? t.auth_accept_accepting : t.auth_accept_cta}
        </button>

        {/* Sign out — discreet secondary action */}
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              background: "none", border: "none",
              fontSize: 12.5, color: C.navyFaint,
              cursor: "pointer", padding: "4px 8px",
              fontFamily: "var(--font-inter, sans-serif)",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.navyMid; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.navyFaint; }}
          >
            {t.auth_accept_signOut}
          </button>
        </div>
      </div>
    </div>
  );
}
