"use client";

import { useState } from "react";
import Link from "next/link";
import { PeakadexLogo } from "@/components/brand/Logo";
import { useLandingT } from "./LandingLocaleContext";

function NewsletterForm() {
  const t = useLandingT();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale: t.locale }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "ok") {
    return (
      <p style={{ fontSize: 13, color: "#4ADE80", lineHeight: 1.5, margin: "16px 0 0" }}>
        ✓ {t.newsletter_success}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(240,244,255,0.35)", margin: "0 0 10px" }}>
        {t.newsletter_label}
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.newsletter_placeholder}
          required
          style={{
            flex: 1,
            minWidth: 0,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "9px 12px",
            fontSize: 13,
            color: "#F0F4FF",
            outline: "none",
            fontFamily: "var(--font-inter, sans-serif)",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            flexShrink: 0,
            background: "#2F7A5F",
            border: "none",
            borderRadius: 8,
            padding: "9px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            cursor: status === "loading" ? "default" : "pointer",
            opacity: status === "loading" ? 0.6 : 1,
            transition: "opacity 0.2s, background 0.2s",
            fontFamily: "var(--font-inter, sans-serif)",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => { if (status !== "loading") (e.currentTarget as HTMLButtonElement).style.background = "#3FA37A"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#2F7A5F"; }}
        >
          {status === "loading" ? "…" : t.newsletter_cta}
        </button>
      </div>
      {status === "error" && (
        <p style={{ fontSize: 12, color: "#F87171", margin: "6px 0 0" }}>{t.newsletter_error}</p>
      )}
    </form>
  );
}

export default function LandingFooter() {
  const t = useLandingT();
  const footerLinks = {
    [t.footer_col_product]: t.footer_links_product,
    [t.footer_col_legal]: t.footer_links_legal,
  };

  return (
    <footer
      style={{
        background: "#0D2538",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "48px 0 32px",
      }}
    >
      <div className="ld-container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 48,
            marginBottom: 40,
          }}
          className="ld-footer-grid"
        >
          {/* Brand column — logo + tagline + newsletter */}
          <div>
            <Link href="/" style={{ textDecoration: "none", display: "inline-block", marginBottom: 14 }}>
              <PeakadexLogo height={28} peakColor="#F0F4FF" adexColor="rgba(240,244,255,0.5)" iconBgColor="#0D2538" />
            </Link>
            <p
              style={{
                fontSize: 13,
                color: "rgba(240,244,255,0.38)",
                lineHeight: 1.6,
                maxWidth: 260,
                margin: "0 0 20px",
              }}
            >
              {t.footer_tagline1}
              <br />
              {t.footer_tagline2}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "rgba(240,244,255,0.22)",
                lineHeight: 1.5,
              }}
            >
              {t.footer_made}
            </p>
            <NewsletterForm />
          </div>

          {/* Nav columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(240,244,255,0.35)",
                  marginBottom: 16,
                }}
              >
                {title}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={{
                        fontSize: 13,
                        color: "rgba(240,244,255,0.5)",
                        textDecoration: "none",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#F0F4FF")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(240,244,255,0.5)")}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 12, color: "rgba(240,244,255,0.25)", margin: 0 }}>
            © {new Date().getFullYear()} {t.footer_copyright}
          </p>
          <Link
            href="/cookies"
            style={{ fontSize: 12, color: "rgba(240,244,255,0.2)", textDecoration: "none" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(240,244,255,0.5)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(240,244,255,0.2)")}
          >
            Configuración de cookies
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .ld-footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
          }
          .ld-footer-grid > div:first-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </footer>
  );
}
