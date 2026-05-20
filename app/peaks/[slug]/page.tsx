import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LANDING_PEAKS, rarityForAlt, slugifyPeak, getPeakBySlug } from "@/lib/data/landing-peaks";

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

// ─── Mountain scene SVG (server-renderable, no hooks) ─────────────────────────
function MountainScene({ color, altM, uid }: { color: string; altM: number; uid: string }) {
  let skyTop: string, skyBot: string, terrainFar: string, terrainNear: string;
  if (altM >= 5000) {
    skyTop = "#04040F"; skyBot = "#141430";
    terrainFar = color + "25"; terrainNear = color + "45";
  } else if (altM >= 3000) {
    skyTop = "#0D2248"; skyBot = "#2A5080";
    terrainFar = color + "30"; terrainNear = color + "55";
  } else if (altM >= 1000) {
    skyTop = "#1A4B8F"; skyBot = "#5A8FBF";
    terrainFar = color + "35"; terrainNear = color + "60";
  } else {
    skyTop = "#3A76BF"; skyBot = "#8AB8D8";
    terrainFar = color + "40"; terrainNear = color + "65";
  }

  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      viewBox="0 0 240 200"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBot} />
        </linearGradient>
        <linearGradient id={`ov-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
          <stop offset="50%"  stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.72)" />
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill={`url(#sky-${uid})`} />
      <path d="M0 155 L40 110 L80 130 L130 90 L175 115 L210 85 L240 105 L240 200 L0 200Z"
        fill={terrainFar} />
      <path d="M30 200 L120 55 L210 200Z" fill={terrainNear} />
      <path d="M120 55 L104 92 L120 84 L136 92Z" fill="rgba(255,255,255,0.88)" />
      <path d="M120 55 L104 92 L120 84Z" fill="rgba(255,255,255,0.25)" />
      <rect width="240" height="200" fill={`url(#ov-${uid})`} />
    </svg>
  );
}

// ─── Small card for related peaks ─────────────────────────────────────────────
function RelatedPeakCard({ peakName, altitudeM, altLabel, mountainRange, color, slug }: {
  peakName: string; altitudeM: number; altLabel: string; mountainRange: string; color: string; slug: string;
}) {
  const uid = `rel-${slug}`;
  return (
    <a
      href={`/peaks/${slug}`}
      style={{
        display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit",
        borderRadius: 14, overflow: "hidden", background: "#FFFFFF",
        border: "1px solid rgba(13,37,56,0.09)", boxShadow: "0 2px 12px rgba(13,37,56,0.08)",
        flex: "1 1 0", minWidth: 0,
      }}
    >
      <div style={{ position: "relative", height: 120, overflow: "hidden" }}>
        <MountainScene color={color} altM={altitudeM} uid={uid} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: color, color: "#fff",
          fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
          letterSpacing: "0.04em",
        }}>
          {rarityForAlt(altitudeM).name}
        </div>
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0D2538", lineHeight: 1.2 }}>{peakName}</div>
        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{altLabel} · {mountainRange}</div>
      </div>
    </a>
  );
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

  const initials = peak.user.split(" ").map((w: string) => w[0]).join("");
  const latStr = `${Math.abs(peak.lat).toFixed(4)}°${peak.lat >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(peak.lng).toFixed(4)}°${peak.lng >= 0 ? "E" : "W"}`;

  // Related peaks: same mountain range (excluding self), up to 3
  const related = LANDING_PEAKS.filter(
    (p) => p.mountainRange === peak.mountainRange && p.peakName !== peak.peakName
  ).slice(0, 3);
  const relatedFinal = related.length >= 3
    ? related
    : [
        ...related,
        ...LANDING_PEAKS.filter(
          (p) => p.country === peak.country && p.peakName !== peak.peakName && !related.includes(p)
        ),
      ].slice(0, 3);

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

  // Card dimensions (same ratio as landing: 240×410, scaled up slightly)
  const CARD_W = 240;
  const CARD_H = 410;

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
          grid-template-columns: ${CARD_W}px 1fr;
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
          <a href="/" style={{ fontWeight: 800, fontSize: 18, color: "#0D2538", textDecoration: "none", letterSpacing: "-0.02em" }}>
            Peakadex
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

            {/* Left: exact landing card front */}
            <div className="pk-card-wrap">
              <div style={{
                width: CARD_W,
                height: CARD_H,
                borderRadius: 18,
                overflow: "hidden",
                background: "#FFFFFF",
                border: "1px solid rgba(13,37,56,0.09)",
                boxShadow: "0 8px 32px rgba(13,37,56,0.14)",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
              }}>

                {/* User header */}
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: peak.userColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff",
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0D2538" }}>{peak.user}</div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{peak.date}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, opacity: 0.3 }}>
                    {[0, 1, 2].map((d) => (
                      <div key={d} style={{ width: 3, height: 3, borderRadius: "50%", background: "#0D2538" }} />
                    ))}
                  </div>
                </div>

                {/* Photo area */}
                <div style={{ flex: 1, position: "relative", overflow: "hidden", margin: "0 10px", borderRadius: 14 }}>
                  {peak.photo
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={peak.photo} alt={peak.peakName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : <MountainScene color={rarity.color} altM={peak.altitudeM} uid={uid} />
                  }
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 50%, transparent 100%)" }} />
                  {/* Peak name + coords overlay */}
                  <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: 3, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
                      {peak.peakName}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
                      📍 {latStr} · {lngStr}
                    </div>
                  </div>
                </div>

                {/* Stat band: RAREZA · ALTITUD · RECOMPENSA */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "10px" }}>
                  <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>RAREZA</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: rarity.color, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, lineHeight: 1.2 }}>
                      ✿ <span style={{ fontSize: 10 }}>{rarity.name}</span>
                    </div>
                  </div>
                  <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>ALTITUD</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#0D2538", whiteSpace: "nowrap" }}>{peak.altLabel}</div>
                  </div>
                  <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>RECOMPENSA</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap" }}>+{rarity.ep}</div>
                  </div>
                </div>

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

        {/* ── Related peaks ── */}
        {relatedFinal.length > 0 && (
          <section style={{ padding: "48px 24px 64px", maxWidth: 860, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 800, color: "#0D2538", letterSpacing: "-0.01em" }}>
              Más cimas en {peak.mountainRange}
            </h2>
            <div className="pk-related-grid">
              {relatedFinal.map((p) => (
                <RelatedPeakCard
                  key={p.peakName}
                  peakName={p.peakName}
                  altitudeM={p.altitudeM}
                  altLabel={p.altLabel}
                  mountainRange={p.mountainRange}
                  color={rarityForAlt(p.altitudeM).color}
                  slug={slugifyPeak(p.peakName)}
                />
              ))}
            </div>
          </section>
        )}

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
