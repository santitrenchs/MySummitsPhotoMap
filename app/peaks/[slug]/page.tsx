import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LANDING_PEAKS, rarityForAlt, slugifyPeak, getPeakBySlug } from "@/lib/data/landing-peaks";
import { PeakadexLogo } from "@/components/brand/Logo";
import { PeakCard } from "./PeakCard";
import { PeakCarousel } from "./PeakCarousel";

const BASE = "https://www.peakadex.com";

// ─── Static params ─────────────────────────────────────────────────────────────
export function generateStaticParams() {
  return LANDING_PEAKS.map((p) => ({ slug: slugifyPeak(p.peakName) }));
}

// ─── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const peak = getPeakBySlug(slug);
  if (!peak) return {};

  const rarity = rarityForAlt(peak.altitudeM);
  const url = `${BASE}/peaks/${slug}`;
  const title = `${peak.peakName} (${peak.altLabel}) — Ascensión y ruta en ${peak.mountainRange} | Peakadex`;
  const description = `El ${peak.peakName} es una cima de ${peak.mountainRange} con ${peak.altLabel} de altitud y rareza ${rarity.name}. ${peak.ascents} ascensiones registradas en Peakadex. ¿Has subido el ${peak.peakName}?`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function PeakPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const peak = getPeakBySlug(slug);
  if (!peak) notFound();

  const rarity = rarityForAlt(peak.altitudeM);
  const uid = slug;

  // All other peaks for the carousel
  const otherPeaks = LANDING_PEAKS.filter((p) => p.peakName !== peak.peakName);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Mountain",
        name: peak.peakName,
        geo: { "@type": "GeoCoordinates", latitude: peak.lat, longitude: peak.lng },
        description: `${peak.peakName} es una cima de ${peak.mountainRange} (${peak.country}) con ${peak.altLabel} de altitud. Rareza ${rarity.name} en Peakadex.`,
        url: `${BASE}/peaks/${slug}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Peakadex", item: BASE },
          { "@type": "ListItem", position: 2, name: "Atlas de cimas", item: `${BASE}/peaks` },
          { "@type": "ListItem", position: 3, name: peak.mountainRange },
          { "@type": "ListItem", position: 4, name: peak.peakName },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        .pk-hero-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 48px;
          align-items: start;
          max-width: 860px;
          margin: 0 auto;
          padding: 48px 24px 64px;
        }
        .pk-related-grid {
          display: flex;
          gap: 16px;
          flex-wrap: nowrap;
        }
        @media (max-width: 640px) {
          .pk-hero-grid {
            grid-template-columns: 1fr;
            gap: 32px;
            padding: 32px 16px 48px;
          }
          .pk-card-wrap {
            display: flex;
            justify-content: center;
          }
          .pk-related-grid {
            flex-wrap: wrap;
          }
          .pk-related-grid > * {
            flex: 1 1 140px !important;
          }
        }
      `}</style>

      <div style={{ fontFamily: "var(--font-inter, sans-serif)", background: "#F4F7FA", minHeight: "100vh", color: "#0D2538" }}>

        {/* ── Nav strip ── */}
        <header style={{
          height: 52, background: "#FFFFFF",
          borderBottom: "1px solid rgba(13,37,56,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", position: "sticky", top: 0, zIndex: 10,
        }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <PeakadexLogo height={32} />
          </a>
          <a href="/register" style={{
            background: "#2F7A5F", color: "#FFFFFF",
            fontSize: 13, fontWeight: 700, padding: "7px 16px",
            borderRadius: 99, textDecoration: "none",
            letterSpacing: "-0.01em",
          }}>
            Registrarse gratis →
          </a>
        </header>

        {/* ── Hero ── */}
        <section style={{ background: "#F4F7FA" }}>
          <div className="pk-hero-grid">

            {/* Left: flippable card (client component) */}
            <div className="pk-card-wrap">
              <div>
                <PeakCard peak={peak} uid={uid} />
                <p style={{ textAlign: "center", fontSize: 11, color: "rgba(13,37,56,0.3)", marginTop: 10 }}>
                  Toca la carta para girarla
                </p>
              </div>
            </div>

            {/* Right: info */}
            <div>
              {/* Breadcrumb */}
              <nav style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <a href="/" style={{ color: "#9CA3AF", textDecoration: "none" }}>Peakadex</a>
                <span>›</span>
                <span>Atlas</span>
                <span>›</span>
                <span>{peak.mountainRange}</span>
                <span>›</span>
                <span style={{ color: "#0D2538", fontWeight: 600 }}>{peak.peakName}</span>
              </nav>

              {/* H1 */}
              <h1 style={{ margin: "0 0 16px", fontSize: 32, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#0D2538" }}>
                Ascensión al {peak.peakName}
              </h1>

              {/* Altitude badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#2F7A5F", color: "#FFFFFF", borderRadius: 99, padding: "6px 16px", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                ⛰️ {peak.altLabel}
              </div>

              {/* Rarity + EP */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: rarity.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: rarity.color }}>✿ {rarity.name}</span>
                <span style={{ fontSize: 13, color: "#9CA3AF" }}>·</span>
                <span style={{ fontSize: 13, color: "#F97316", fontWeight: 600 }}>+{rarity.ep}</span>
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#0D2538", lineHeight: 1 }}>{peak.ascents.toLocaleString("es")}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Ascensiones</div>
                </div>
                <div style={{ width: 1, background: "#E5E7EB" }} />
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#0D2538", lineHeight: 1 }}>{peak.climbers.toLocaleString("es")}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Alpinistas</div>
                </div>
              </div>

              {/* Quote */}
              <blockquote style={{
                margin: "0 0 20px",
                borderLeft: `3px solid ${rarity.color}`,
                paddingLeft: 16,
                fontStyle: "italic",
                fontSize: 14,
                color: "#374151",
                lineHeight: 1.7,
              }}>
                &ldquo;{peak.message}&rdquo;
                <footer style={{ marginTop: 6, fontStyle: "normal", fontSize: 12, fontWeight: 600, color: "#9CA3AF" }}>
                  — {peak.user}
                </footer>
              </blockquote>

              {/* Route chip */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "1px solid rgba(13,37,56,0.1)", borderRadius: 99, padding: "6px 14px", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                🗺️ {peak.route}
              </div>
            </div>

          </div>
        </section>

        {/* ── CTA section ── */}
        <section style={{ background: "#0D2538", padding: "64px 24px", textAlign: "center" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            ¿Has subido el {peak.peakName}?
          </h2>
          <p style={{ margin: "0 0 32px", fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
            Regístralo en Peakadex y consigue tu carta {rarity.name}
          </p>
          <a href="/register" style={{
            display: "inline-block",
            background: "#FFFFFF", color: "#0D2538",
            fontSize: 16, fontWeight: 800, padding: "14px 32px",
            borderRadius: 99, textDecoration: "none",
            letterSpacing: "-0.01em",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}>
            Registrar mi ascensión →
          </a>
          <p style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
            Gratis · Sin tarjeta de crédito · En 1 minuto
          </p>
        </section>

        {/* ── Other peaks carousel ── */}
        <section style={{ padding: "48px 0 64px", background: "#F4F7FA" }}>
          <h2 style={{ margin: "0 0 32px", fontSize: 20, fontWeight: 800, color: "#0D2538", letterSpacing: "-0.01em", textAlign: "center" }}>
            Otras cimas
          </h2>
          <PeakCarousel peaks={otherPeaks} />
        </section>

        {/* ── Footer ── */}
        <footer style={{
          borderTop: "1px solid rgba(13,37,56,0.08)",
          padding: "24px",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 20, flexWrap: "wrap",
          fontSize: 12, color: "#9CA3AF",
        }}>
          <span>© Peakadex</span>
          <a href="/privacy" style={{ color: "#9CA3AF", textDecoration: "none" }}>Privacidad</a>
          <a href="/terms" style={{ color: "#9CA3AF", textDecoration: "none" }}>Términos</a>
          <a href="/" style={{ color: "#9CA3AF", textDecoration: "none" }}>← Volver al inicio</a>
        </footer>

      </div>
    </>
  );
}
