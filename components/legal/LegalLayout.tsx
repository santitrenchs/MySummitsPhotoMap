import Link from "next/link";
import { PeakadexLogo } from "@/components/brand/Logo";

export default function LegalLayout({
  title,
  lastUpdated,
  contentHtml,
  backLabel = "← Volver al inicio",
  termsLink = "Términos de uso",
  privacyLink = "Política de privacidad",
  cookiesLink = "Política de cookies",
}: {
  title: string;
  lastUpdated: string;
  contentHtml: string;
  backLabel?: string;
  termsLink?: string;
  privacyLink?: string;
  cookiesLink?: string;
}) {
  return (
    <>
      <style>{`
        /* ── Nav ── */
        .legal-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(13,37,56,0.08);
          padding: 0 24px;
          height: 60px;
          display: flex; align-items: center;
        }
        .legal-nav-inner {
          max-width: 800px; margin: 0 auto; width: 100%;
          display: flex; align-items: center; justify-content: space-between;
        }
        .legal-back {
          font-size: 13px; color: #5A6E84; text-decoration: none;
          display: flex; align-items: center; gap: 6px;
          transition: color 0.15s;
        }
        .legal-back:hover { color: #0D2538; }

        /* ── Page ── */
        .legal-page {
          min-height: 100vh;
          background: #FAFAFA;
          font-family: var(--font-inter, sans-serif);
          color: #0D2538;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        /* ── Hero header ── */
        .legal-header {
          background: #0D2538;
          padding: 56px 24px 48px;
          text-align: center;
        }
        .legal-header h1 {
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 700;
          color: #F0F4FF;
          margin: 0 0 10px;
          letter-spacing: -0.02em;
          font-family: var(--font-space, sans-serif);
        }
        .legal-header-meta {
          font-size: 13px;
          color: rgba(240,244,255,0.45);
        }

        /* ── Prose container ── */
        .legal-prose {
          max-width: 800px;
          margin: 0 auto;
          padding: 56px 24px 80px;
        }

        /* ── Typography ── */
        .legal-prose h2 {
          font-size: 20px; font-weight: 700;
          color: #0D2538;
          margin: 40px 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(13,37,56,0.08);
          font-family: var(--font-space, sans-serif);
          letter-spacing: -0.01em;
        }
        .legal-prose h2:first-child { margin-top: 0; }
        .legal-prose h3 {
          font-size: 15px; font-weight: 700;
          color: #0D2538;
          margin: 28px 0 8px;
        }
        .legal-prose p {
          font-size: 15px; line-height: 1.75;
          color: #374151;
          margin: 0 0 14px;
        }
        .legal-prose p.legal-meta {
          font-size: 12px; color: #9CA3AF;
          font-style: italic; margin-top: 40px;
        }
        .legal-prose strong { color: #0D2538; font-weight: 600; }
        .legal-prose code {
          font-family: var(--font-mono-landing, monospace);
          font-size: 13px;
          background: rgba(13,37,56,0.06);
          padding: 2px 6px; border-radius: 4px;
          color: #0D2538;
        }
        .legal-prose a {
          color: #2F7A5F; text-decoration: underline;
          text-decoration-color: rgba(47,122,95,0.4);
        }
        .legal-prose a:hover { text-decoration-color: #2F7A5F; }
        .legal-prose hr {
          border: none;
          border-top: 1px solid rgba(13,37,56,0.08);
          margin: 32px 0;
        }
        .legal-prose ul {
          margin: 0 0 16px;
          padding-left: 20px;
        }
        .legal-prose li {
          font-size: 15px; line-height: 1.7;
          color: #374151;
          margin-bottom: 6px;
        }
        .legal-prose blockquote {
          margin: 16px 0;
          padding: 14px 18px;
          background: rgba(245,200,66,0.07);
          border-left: 3px solid #F5C842;
          border-radius: 0 8px 8px 0;
          font-size: 14px; color: #5A6E84;
        }
        .legal-prose table {
          width: 100%; border-collapse: collapse;
          margin: 16px 0 24px;
          font-size: 13px;
        }
        .legal-prose th {
          background: rgba(13,37,56,0.04);
          font-weight: 700; text-align: left;
          padding: 10px 12px;
          border-bottom: 2px solid rgba(13,37,56,0.1);
          color: #0D2538;
        }
        .legal-prose td {
          padding: 9px 12px;
          border-bottom: 1px solid rgba(13,37,56,0.06);
          color: #374151;
          vertical-align: top;
        }
        .legal-prose tr:last-child td { border-bottom: none; }

        /* ── Footer ── */
        .legal-footer {
          background: #0D2538;
          padding: 32px 24px;
          text-align: center;
        }
        .legal-footer p {
          font-size: 12px;
          color: rgba(240,244,255,0.35);
          margin: 0 0 12px;
        }
        .legal-footer-links {
          display: flex; gap: 24px; justify-content: center;
          flex-wrap: wrap;
        }
        .legal-footer-links a {
          font-size: 12px;
          color: rgba(240,244,255,0.45);
          text-decoration: none;
          transition: color 0.15s;
        }
        .legal-footer-links a:hover { color: #F0F4FF; }

        @media (max-width: 640px) {
          .legal-prose { padding: 40px 16px 60px; }
          .legal-header { padding: 40px 16px 32px; }
          .legal-prose table { display: block; overflow-x: auto; }
        }
      `}</style>

      <div className="legal-page">
        {/* Nav */}
        <nav className="legal-nav">
          <div className="legal-nav-inner">
            <Link href="/" style={{ textDecoration: "none", display: "inline-flex" }}>
              <PeakadexLogo height={24} />
            </Link>
            <Link href="/" className="legal-back">
              {backLabel}
            </Link>
          </div>
        </nav>

        {/* Header */}
        <div className="legal-header">
          <h1>{title}</h1>
          <p className="legal-header-meta">{lastUpdated}</p>
        </div>

        {/* Content */}
        <article
          className="legal-prose"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {/* Footer */}
        <footer className="legal-footer">
          <p>© {new Date().getFullYear()} Peakadex · Santi Trenchs Sainz de la Maza</p>
          <div className="legal-footer-links">
            <Link href="/privacy">{privacyLink}</Link>
            <Link href="/terms">{termsLink}</Link>
            <Link href="/cookies">{cookiesLink}</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
