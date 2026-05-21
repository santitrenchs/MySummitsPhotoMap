import { LANDING_PEAKS, rarityForAlt, slugifyPeak, type PeakCardData } from "@/lib/data/landing-peaks";
import { PeakadexLogo } from "@/components/brand/Logo";
import type { PeakPageT } from "@/lib/i18n/peaks";
import { PeakCard } from "./PeakCard";
import { PeakFooter } from "./PeakFooter";

const BASE = "https://www.peakadex.com";

const MINI_W = 120;
const MINI_H = 205;

function MiniPeakCard({ peak, urlPrefix }: { peak: PeakCardData; urlPrefix: string }) {
  const rarity = rarityForAlt(peak.altitudeM);
  const slug = slugifyPeak(peak.peakName);
  const initials = peak.user.split(" ").map((w) => w[0]).join("");
  return (
    <a href={`${urlPrefix}/peaks/${slug}`} style={{
      display: "flex", flexDirection: "column",
      width: MINI_W, height: MINI_H, textDecoration: "none", flexShrink: 0,
      borderRadius: 9, overflow: "hidden", background: "#FFFFFF",
      border: "1px solid rgba(13,37,56,0.09)", boxShadow: "0 4px 16px rgba(13,37,56,0.12)",
    }}>
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

export function PeakPageContent({ peak, slug, t }: { peak: PeakCardData; slug: string; t: PeakPageT }) {
  const rarity = rarityForAlt(peak.altitudeM);
  const relatedPeaks = LANDING_PEAKS.filter((p) => p.peakName !== peak.peakName);
  const homeHref = t.urlPrefix ? t.urlPrefix : "/";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Mountain",
        name: peak.peakName,
        geo: { "@type": "GeoCoordinates", latitude: peak.lat, longitude: peak.lng },
        description: t.schema_desc(peak, rarity.name),
        url: `${BASE}${t.urlPrefix}/peaks/${slug}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Peakadex", item: BASE },
          { "@type": "ListItem", position: 2, name: t.schema_atlas, item: `${BASE}${t.urlPrefix}/peaks` },
          { "@type": "ListItem", position: 3, name: peak.peakName },
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
        .pk-cta { transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease; }
        .pk-cta:hover { background: #2F7A5F !important; transform: translateY(-1px); box-shadow: 0 8px 40px rgba(220, 80, 60, 0.38); }
        @media (max-width: 640px) {
          .pk-hero-grid {
            grid-template-columns: 1fr;
            gap: 32px;
            padding: 32px 16px 48px;
          }
          .pk-card-wrap { display: flex; justify-content: center; }
        }
      `}</style>

      <div style={{ fontFamily: "var(--font-inter, sans-serif)", background: "#F4F7FA", minHeight: "100vh", color: "#0D2538" }}>

        {/* Nav */}
        <header style={{ background: "#FFFFFF", borderBottom: "1px solid rgba(13,37,56,0.07)", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <a href={homeHref} style={{ textDecoration: "none" }}><PeakadexLogo height={32} /></a>
            <div />
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <a href="/login" style={{ fontSize: 14, fontWeight: 500, color: "#0D2538", textDecoration: "none" }}>{t.nav_login}</a>
              <a href="/register" style={{ background: "#2F7A5F", color: "#FFFFFF", fontSize: 13, fontWeight: 700, padding: "8px 20px", borderRadius: 99, textDecoration: "none", letterSpacing: "-0.01em" }}>
                {t.nav_register}
              </a>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section style={{ background: "#F4F7FA" }}>
          <div className="pk-hero-grid">
            <div className="pk-card-wrap">
              <div>
                <PeakCard peak={peak} uid={slug} />
                <p style={{ textAlign: "center", fontSize: 12, color: "rgba(13,37,56,0.35)", marginTop: 10, letterSpacing: "0.01em" }}>
                  {t.card_tap_hint}
                </p>
              </div>
            </div>

            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#2F7A5F" }}>
                Collectible Summit Cards
              </p>
              <h1 style={{ margin: "0 0 16px", fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#0D2538" }}>
                {t.h1_prefix}<span style={{ color: "#F5A623" }}>{peak.peakName}</span>{t.h1_suffix}
              </h1>

              <div style={{ display: "inline-grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24, minWidth: 280 }}>
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>{t.stat_rarity}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: rarity.color, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>✿ {rarity.name}</div>
                </div>
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>{t.stat_altitude}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0D2538", whiteSpace: "nowrap" }}>{peak.altLabel}</div>
                </div>
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>{t.stat_reward}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap" }}>+{rarity.ep}</div>
                </div>
              </div>

              <blockquote style={{ margin: "0 0 20px", borderLeft: `3px solid ${rarity.color}`, paddingLeft: 16, fontStyle: "italic", fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                &ldquo;{peak.message}&rdquo;
                <footer style={{ marginTop: 6, fontStyle: "normal", fontSize: 12, fontWeight: 600, color: "#9CA3AF" }}>
                  — {peak.user}
                </footer>
              </blockquote>

              <a href="/register" className="pk-cta" style={{ display: "inline-block", background: "#2F7A5F", color: "#FFFFFF", fontSize: 15, fontWeight: 700, padding: "12px 28px", borderRadius: 99, textDecoration: "none", letterSpacing: "-0.01em" }}>
                {t.cta_capture(peak.peakName)}
              </a>
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section style={{ background: "#FFFFFF", borderTop: "1px solid rgba(13,37,56,0.07)", borderBottom: "1px solid rgba(13,37,56,0.07)", padding: "64px 24px", textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#2F7A5F" }}>
            Collectible Summit Cards
          </p>
          <h2 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 800, color: "#0D2538", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {t.cta_q_prefix}<span style={{ color: "#F5A623" }}>{peak.peakName}</span>{t.cta_q_suffix}
          </h2>
          <p style={{ margin: "0 0 32px", fontSize: 16, color: "#6B7280", maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            {t.cta_body(rarity.name)}
          </p>
          <a href="/register" className="pk-cta" style={{ display: "inline-block", background: "#2F7A5F", color: "#FFFFFF", fontSize: 15, fontWeight: 700, padding: "14px 32px", borderRadius: 99, textDecoration: "none", letterSpacing: "-0.01em" }}>
            {t.cta_button}
          </a>
          <p style={{ marginTop: 12, fontSize: 12, color: "#9CA3AF" }}>{t.cta_micro}</p>
        </section>

        {/* Other peaks scroll */}
        <section style={{ padding: "32px 0 48px", background: "#F4F7FA" }}>
          <div className="pk-mini-scroll">
            {relatedPeaks.map((p) => <MiniPeakCard key={p.peakName} peak={p} urlPrefix={t.urlPrefix} />)}
          </div>
        </section>

        <PeakFooter locale={t.locale} />

      </div>
    </>
  );
}
