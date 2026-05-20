import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LANDING_PEAKS, rarityForAlt, slugifyPeak, getPeakBySlug, type PeakCardData } from "@/lib/data/landing-peaks";
import { PeakadexLogo } from "@/components/brand/Logo";
import { PeakCard } from "./PeakCard";


const MINI_W = 120;
const MINI_H = 205;

function MiniPeakCard({ peak }: { peak: PeakCardData }) {
  const rarity = rarityForAlt(peak.altitudeM);
  const slug = slugifyPeak(peak.peakName);
  const initials = peak.user.split(" ").map((w) => w[0]).join("");
  return (
    <a href={`/peaks/${slug}`} style={{
      display: "flex", flexDirection: "column",
      width: MINI_W, height: MINI_H, textDecoration: "none", flexShrink: 0,
      borderRadius: 9, overflow: "hidden", background: "#FFFFFF",
      border: "1px solid rgba(13,37,56,0.09)", boxShadow: "0 4px 16px rgba(13,37,56,0.12)",
    }}>
      {/* User header */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 6px" }}>
        <div style={{
          width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
          background: peak.userColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 5.5, fontWeight: 700, color: "#fff",
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 6.5, fontWeight: 700, color: "#0D2538", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{peak.user}</div>
          <div style={{ fontSize: 5.5, color: "#6B7280" }}>{peak.date}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1.5, opacity: 0.3 }}>
          {[0,1,2].map(d => <div key={d} style={{ width: 1.5, height: 1.5, borderRadius: "50%", background: "#0D2538" }} />)}
        </div>
      </div>
      {/* Photo */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", margin: "0 5px", borderRadius: 7 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {peak.photo
          ? <img src={peak.photo} alt={peak.peakName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", background: `linear-gradient(to bottom, ${rarity.color}44, ${rarity.color}88)` }} />
        }
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 50%, transparent 100%)" }} />
        <div style={{ position: "absolute", bottom: 6, left: 7, right: 7 }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: 1.5, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{peak.peakName}</div>
          <div style={{ fontSize: 5.5, color: "rgba(255,255,255,0.7)" }}>📍 {Math.abs(peak.lat).toFixed(2)}°{peak.lat >= 0 ? "N" : "S"}</div>
        </div>
      </div>
      {/* Stat band */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3, padding: "5px" }}>
        <div style={{ background: "#F8FAFC", borderRadius: 6, padding: "4px 2px", textAlign: "center" }}>
          <div style={{ fontSize: 4, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>RAREZA</div>
          <div style={{ fontSize: 5, fontWeight: 700, color: rarity.color }}>✿ {rarity.name}</div>
        </div>
        <div style={{ background: "#F8FAFC", borderRadius: 6, padding: "4px 2px", textAlign: "center" }}>
          <div style={{ fontSize: 4, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>ALTITUD</div>
          <div style={{ fontSize: 5, fontWeight: 800, color: "#0D2538", whiteSpace: "nowrap" }}>{peak.altLabel}</div>
        </div>
        <div style={{ background: "#F8FAFC", borderRadius: 6, padding: "4px 2px", textAlign: "center" }}>
          <div style={{ fontSize: 4, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>EP</div>
          <div style={{ fontSize: 5, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap" }}>+{rarity.ep}</div>
        </div>
      </div>
    </a>
  );
}

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

  const relatedPeaks = LANDING_PEAKS.filter((p) => p.peakName !== peak.peakName);

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
        .pk-mini-scroll {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          overflow-y: visible;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding: 8px 24px 16px;
          scrollbar-width: none;
        }
        .pk-mini-scroll::-webkit-scrollbar { display: none; }
        .pk-mini-scroll > a { scroll-snap-align: start; flex-shrink: 0; }
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
        }
      `}</style>

      <div style={{ fontFamily: "var(--font-inter, sans-serif)", background: "#F4F7FA", minHeight: "100vh", color: "#0D2538" }}>

        {/* ── Nav strip ── */}
        <header style={{
          background: "#FFFFFF",
          borderBottom: "1px solid rgba(13,37,56,0.07)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{
            maxWidth: 1200, margin: "0 auto", padding: "0 32px",
            height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <a href="/" style={{ textDecoration: "none" }}>
              <PeakadexLogo height={32} />
            </a>
            <div />
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <a href="/login" style={{ fontSize: 14, fontWeight: 500, color: "#0D2538", textDecoration: "none" }}>Iniciar sesión</a>
              <a href="/register" style={{
                background: "#2F7A5F", color: "#FFFFFF",
                fontSize: 13, fontWeight: 700, padding: "8px 20px",
                borderRadius: 99, textDecoration: "none", letterSpacing: "-0.01em",
              }}>
                Registrarse
              </a>
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <section style={{ background: "#F4F7FA" }}>
          <div className="pk-hero-grid">

            {/* Left: flippable card (client component) */}
            <div className="pk-card-wrap">
              <div>
                <PeakCard peak={peak} uid={uid} />
                <p style={{ textAlign: "center", fontSize: 12, color: "rgba(13,37,56,0.35)", marginTop: 10, letterSpacing: "0.01em" }}>
                  Toca para ver el reverso
                </p>
              </div>
            </div>

            {/* Right: info */}
            <div>
              {/* Label */}
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#2F7A5F" }}>
                Collectible Summit Cards
              </p>
              {/* H1 */}
              <h1 style={{ margin: "0 0 16px", fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#0D2538" }}>
                Ascensión al{" "}
                <span style={{ color: "#F5A623" }}>{peak.peakName}</span>
              </h1>

              {/* Stat band */}
              <div style={{ display: "inline-grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24, minWidth: 280 }}>
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Rareza</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: rarity.color, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>✿ {rarity.name}</div>
                </div>
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Altitud</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0D2538", whiteSpace: "nowrap" }}>{peak.altLabel}</div>
                </div>
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Recompensa</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap" }}>+{rarity.ep}</div>
                </div>
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

              {/* CTA */}
              <a href="/register" style={{
                display: "inline-block",
                background: "#2F7A5F", color: "#FFFFFF",
                fontSize: 15, fontWeight: 700, padding: "12px 28px",
                borderRadius: 99, textDecoration: "none", letterSpacing: "-0.01em",
              }}>
                Captura {peak.peakName}
              </a>
            </div>

          </div>
        </section>

        {/* ── CTA section ── */}
        <section style={{ background: "#FFFFFF", borderTop: "1px solid rgba(13,37,56,0.07)", borderBottom: "1px solid rgba(13,37,56,0.07)", padding: "64px 24px", textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#2F7A5F" }}>
            Collectible Summit Cards
          </p>
          <h2 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 800, color: "#0D2538", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            ¿Has subido el <span style={{ color: "#F5A623" }}>{peak.peakName}</span>?
          </h2>
          <p style={{ margin: "0 0 32px", fontSize: 16, color: "#6B7280", maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Regístralo en Peakadex y consigue tu carta {rarity.name}
          </p>
          <a href="/register" style={{
            display: "inline-block",
            background: "#2F7A5F", color: "#FFFFFF",
            fontSize: 15, fontWeight: 700, padding: "14px 32px",
            borderRadius: 99, textDecoration: "none", letterSpacing: "-0.01em",
          }}>
            Empieza tu colección
          </a>
          <p style={{ marginTop: 12, fontSize: 12, color: "#9CA3AF" }}>
            Gratis · Sin tarjeta de crédito · En 1 minuto
          </p>
        </section>

        {/* ── Other peaks ── */}
        <section style={{ padding: "32px 0 48px", background: "#F4F7FA" }}>
          <div className="pk-mini-scroll">
            {relatedPeaks.map((p) => <MiniPeakCard key={p.peakName} peak={p} />)}
          </div>
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
