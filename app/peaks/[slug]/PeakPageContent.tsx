import { LANDING_PEAKS, rarityForAlt, slugifyPeak, type PeakCardData } from "@/lib/data/landing-peaks";
import { PeakadexLogo } from "@/components/brand/Logo";
import type { PeakPageT } from "@/lib/i18n/peaks";
import { buildPeakCardStrings, formatComarca, getPeakCardLabels, getPeakMessage, translatePlace } from "@/lib/i18n/peak-content";
import { getPeakChallenges } from "@/lib/data/peak-challenges";
import { PeakChallenges } from "./PeakChallenges";
import { PeakCard } from "./PeakCard";
import { PeakFooter } from "./PeakFooter";

const BASE = "https://www.peakadex.com";

const MINI_W = 120;
const MINI_H = 205;

function MiniPeakCard({ peak, t }: { peak: PeakCardData; t: PeakPageT }) {
  const rarity = rarityForAlt(peak.altitudeM);
  const slug = slugifyPeak(peak.peakName);
  const l = buildPeakCardStrings(peak, t.locale);
  const urlPrefix = t.urlPrefix;
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
          <div style={{ fontSize: 5.5, color: "#6B7280" }}>{l.dateLabel}</div>
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
          <div style={{ fontSize: 4, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>{l.rarity}</div>
          <div style={{ fontSize: 5, fontWeight: 700, color: rarity.color }}>✿ {rarity.name}</div>
        </div>
        <div style={{ background: "#F8FAFC", borderRadius: 6, padding: "4px 2px", textAlign: "center" }}>
          <div style={{ fontSize: 4, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>{l.altitude}</div>
          <div style={{ fontSize: 5, fontWeight: 800, color: "#0D2538", whiteSpace: "nowrap" }}>{l.altLabel}</div>
        </div>
        <div style={{ background: "#F8FAFC", borderRadius: 6, padding: "4px 2px", textAlign: "center" }}>
          <div style={{ fontSize: 4, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>{l.ep}</div>
          <div style={{ fontSize: 5, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap" }}>+{rarity.ep}</div>
        </div>
      </div>
    </a>
  );
}

export function PeakPageContent({ peak, slug, t }: { peak: PeakCardData; slug: string; t: PeakPageT }) {
  const rarity = rarityForAlt(peak.altitudeM);
  const relatedPeaks = LANDING_PEAKS.filter((p) => p.peakName !== peak.peakName);
  const cardStrings = buildPeakCardStrings(peak, t.locale);
  const disclaimer = getPeakCardLabels(t.locale).disclaimer;
  const challenges = getPeakChallenges(slug);
  const comarcaLabel = formatComarca(peak.comarca);
  // Where the mountain actually is — the page never said it in prose before.
  const placeLine = [comarcaLabel, translatePlace(peak.mountainRange, t.locale), translatePlace(peak.country, t.locale)]
    .filter(Boolean)
    .join(" · ");
  const homeHref = t.urlPrefix ? t.urlPrefix : "/";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Mountain",
        name: peak.peakName,
        ...(peak.catalogName !== peak.peakName ? { alternateName: peak.catalogName } : {}),
        geo: { "@type": "GeoCoordinates", latitude: peak.lat, longitude: peak.lng },
        elevation: { "@type": "QuantitativeValue", value: peak.altitudeM, unitCode: "MTR" },
        containedInPlace: {
          "@type": "Place",
          name: translatePlace(peak.mountainRange, t.locale),
          ...(comarcaLabel ? { containedInPlace: { "@type": "AdministrativeArea", name: comarcaLabel } } : {}),
          address: { "@type": "PostalAddress", addressCountry: translatePlace(peak.country, t.locale) },
        },
        ...(peak.photo ? { image: `${BASE}${peak.photo}` } : {}),
        sameAs: [`https://www.openstreetmap.org/node/${peak.osmId.replace(/^node\//, "")}`],
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
        /* Nav: the logo is a fixed-width nowrap block, so at 375px the 32px side
           padding pushed the actions on top of it. Tighten both under 420px. */
        .pk-nav { background: #FFFFFF; border-bottom: 1px solid rgba(13,37,56,0.07); position: sticky; top: 0; z-index: 10; }
        .pk-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .pk-nav-actions { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
        .pk-nav-login { font-size: 14px; font-weight: 500; color: #0D2538; text-decoration: none; white-space: nowrap; }
        .pk-nav-cta { background: #2F7A5F; color: #FFFFFF; font-size: 13px; font-weight: 700; padding: 8px 20px; border-radius: 99px; text-decoration: none; white-space: nowrap; }
        @media (max-width: 420px) {
          .pk-nav-inner { padding: 0 16px; gap: 8px; }
          .pk-nav-actions { gap: 10px; }
          .pk-nav-login { font-size: 13px; }
          .pk-nav-cta { font-size: 12px; padding: 7px 14px; }
        }
        @media (max-width: 400px) {
          /* The logo block has a fixed intrinsic width and cannot wrap, so it is
             scaled down instead: the box shrinks with it and stops colliding. */
          .pk-nav-logo { display: block; width: 126px; transform: scale(0.8); transform-origin: left center; }
          .pk-nav-cta { font-size: 12px; padding: 7px 13px; }
        }
        @media (max-width: 360px) {
          /* Below this the two actions no longer fit beside the logo. Sign-up is
             the page's job; signing in stays reachable from that screen. */
          .pk-nav-login { display: none; }
        }
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
        .pk-challenge-hero { display: flex; align-items: center; gap: 40px; }
        .pk-challenge-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; }
        .pk-challenge-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
        @media (max-width: 760px) {
          .pk-challenge-grid { grid-template-columns: 1fr; gap: 24px; }
          .pk-challenge-steps { grid-template-columns: 1fr; gap: 20px; }
        }
        @media (max-width: 640px) {
          .pk-challenge-hero { flex-direction: column; align-items: flex-start; gap: 24px; }
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
        <header className="pk-nav">
          <div className="pk-nav-inner">
            <a href={homeHref} className="pk-nav-logo" style={{ textDecoration: "none" }}><PeakadexLogo height={32} /></a>
            <div className="pk-nav-actions">
              <a href="/login" className="pk-nav-login">{t.nav_login}</a>
              <a href="/register" className="pk-nav-cta">{t.nav_register}</a>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section style={{ background: "#F4F7FA" }}>
          <div className="pk-hero-grid">
            <div className="pk-card-wrap">
              <div>
                <PeakCard peak={peak} uid={slug} l={cardStrings} />
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

              <p style={{ margin: "0 0 20px", fontSize: 14, color: "#4B5563" }}>{placeLine}</p>

              <div style={{ display: "inline-grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24, minWidth: 280 }}>
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>{t.stat_rarity}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: rarity.color, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>✿ {rarity.name}</div>
                </div>
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>{t.stat_altitude}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0D2538", whiteSpace: "nowrap" }}>{cardStrings.altLabel}</div>
                </div>
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>{t.stat_reward}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap" }}>+{rarity.ep}</div>
                </div>
              </div>

              <blockquote style={{ margin: "0 0 20px", borderLeft: `3px solid ${rarity.color}`, paddingLeft: 16, fontStyle: "italic", fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                &ldquo;{getPeakMessage(peak.peakName, t.locale)}&rdquo;
                <footer style={{ marginTop: 6, fontStyle: "normal", fontSize: 12, fontWeight: 600, color: "#9CA3AF" }}>
                  — {peak.user}
                </footer>
              </blockquote>

              <p style={{ margin: "0 0 20px", fontSize: 11, color: "#9CA3AF", lineHeight: 1.5 }}>
                {disclaimer}
              </p>

              <a href="/register" className="pk-cta" style={{ display: "inline-block", background: "#2F7A5F", color: "#FFFFFF", fontSize: 15, fontWeight: 700, padding: "12px 28px", borderRadius: 99, textDecoration: "none", letterSpacing: "-0.01em" }}>
                {t.cta_capture(peak.peakName)}
              </a>
            </div>
          </div>
        </section>

        <PeakChallenges peakName={peak.peakName} challenges={challenges} locale={t.locale} />

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
            {relatedPeaks.map((p) => <MiniPeakCard key={p.peakName} peak={p} t={t} />)}
          </div>
        </section>

        <PeakFooter locale={t.locale} />

      </div>
    </>
  );
}
