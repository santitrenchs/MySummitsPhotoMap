"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";

const C = {
  navy:       "#0D2538",
  navyMid:    "#5A6E84",
  navyLight:  "#94A3B8",
  border:     "#E5E7EB",
  green:      "#2F7A5F",
  greenHover: "#256650",
} as const;

/**
 * Full-screen overlay rendered inside the app layout when the user
 * hasn't accepted the current T&C / Privacy versions.
 * Uses the app's I18nProvider so locale is always correct.
 */
export default function ConsentGate() {
  const t = useT();

  const [accepted,  setAccepted]  = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleAccept() {
    if (!accepted) { setError(t.auth_legal_mustAccept); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketing }),
      });
      if (!res.ok) throw new Error("failed");
      // Full reload so the server layout re-checks consent and removes this overlay
      window.location.reload();
    } catch {
      setError("Error al guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(13,37,56,0.55)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>
      <div style={{
        width: "100%", maxWidth: 440,
        background: "#fff",
        borderRadius: "var(--radius-xl)",
        border: `1px solid ${C.border}`,
        boxShadow: "0 8px 40px rgba(13,37,56,0.18)",
        padding: "36px 32px 32px",
      }}>
        {/* Title */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.navy, margin: "0 0 10px", textAlign: "center" }}>
          {t.auth_accept_title}
        </h2>
        <p style={{ fontSize: 14, color: C.navyMid, margin: "0 0 28px", textAlign: "center", lineHeight: 1.6 }}>
          {t.auth_accept_subtitle}
        </p>

        {/* Checkboxes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {/* Required */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => { setAccepted(e.target.checked); setError(null); }}
              style={{ marginTop: 2, accentColor: C.green, flexShrink: 0, width: 16, height: 16, cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: C.navyMid, lineHeight: 1.5 }}>
              {t.auth_legal_required.split("{terms}")[0]}
              <Link href="/terms" target="_blank" rel="noopener noreferrer"
                style={{ color: C.green, fontWeight: 600, textDecoration: "none" }}
              >{t.auth_legal_terms}</Link>
              {t.auth_legal_required.split("{terms}")[1]?.split("{privacy}")[0]}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer"
                style={{ color: C.green, fontWeight: 600, textDecoration: "none" }}
              >{t.auth_legal_privacy}</Link>
              {t.auth_legal_required.split("{privacy}")[1]}
            </span>
          </label>

          {/* Optional marketing */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              style={{ marginTop: 2, accentColor: C.green, flexShrink: 0, width: 16, height: 16, cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: C.navyMid, lineHeight: 1.5 }}>
              {t.auth_legal_marketing}
            </span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 13, color: "#dc2626",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleAccept}
          disabled={saving}
          style={{
            width: "100%", padding: "14px 16px",
            background: saving ? C.navyLight : C.green,
            color: "#fff",
            border: "none", borderRadius: "var(--radius-lg)",
            fontSize: 15, fontWeight: 800,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: saving ? "none" : "0 4px 14px rgba(47,122,95,0.32)",
            transition: "background 0.2s",
            fontFamily: "var(--font-inter, sans-serif)",
          }}
          onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = C.greenHover; }}
          onMouseLeave={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = C.green; }}
        >
          {saving ? t.auth_accept_accepting : t.auth_accept_cta}
        </button>

        {/* Sign out escape hatch */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{
            display: "block", width: "100%", marginTop: 14,
            background: "none", border: "none",
            fontSize: 13, color: C.navyLight,
            cursor: "pointer", textAlign: "center",
            fontFamily: "var(--font-inter, sans-serif)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.navyMid; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.navyLight; }}
        >
          {t.settings_signOut}
        </button>
      </div>
    </div>
  );
}
