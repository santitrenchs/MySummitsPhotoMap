import { LANDING_PEAKS, rarityForAlt, slugifyPeak, type PeakCardData } from "@/lib/data/landing-peaks";
import { PeakadexLogo } from "@/components/brand/Logo";
import type { PeakIndexT } from "@/lib/i18n/peaks";
import { PeakFooter } from "./[slug]/PeakFooter";
import { HowItWorksSteps } from "./HowItWorksSteps";

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
          {[0, 1, 2].map(d => <div key={d} style={{ width: 1.5, height: 1.5, borderRadius: "50%", background: "#0D2538" }} />)}
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


export function PeaksIndexContent({ t }: { t: PeakIndexT }) {
  const homeHref = t.urlPrefix || "/";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: t.schema_name,
        url: `${BASE}${t.urlPrefix}/peaks`,
        description: t.schema_desc,
      },
      {
        "@type": "ItemList",
        name: t.catalog_heading,
        numberOfItems: LANDING_PEAKS.length,
        itemListElement: LANDING_PEAKS.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.peakName,
          url: `${BASE}${t.urlPrefix}/peaks/${slugifyPeak(p.peakName)}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Peakadex", item: BASE },
          { "@type": "ListItem", position: 2, name: t.hero_title },
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
        .pk-cta-btn {
          display: inline-block;
          background: #2F7A5F;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          padding: 14px 36px;
          border-radius: 99px;
          text-decoration: none;
          letter-spacing: -0.01em;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .pk-cta-btn:hover { background: #235e48; transform: translateY(-1px); }
      `}</style>

      <div style={{ fontFamily: "var(--font-inter, sans-serif)", background: "#F4F7FA", minHeight: "100vh", color: "#0D2538" }}>

        {/* ── Nav ─────────────────────────────────────────────────────────── */}
        <header style={{ background: "#fff", borderBottom: "1px solid rgba(13,37,56,0.07)", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <a href={homeHref} style={{ textDecoration: "none" }}><PeakadexLogo height={32} /></a>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <a href="/login" style={{ fontSize: 14, fontWeight: 500, color: "#0D2538", textDecoration: "none" }}>{t.nav_login}</a>
              <a href="/register" style={{ background: "#2F7A5F", color: "#fff", fontSize: 13, fontWeight: 700, padding: "8px 20px", borderRadius: 99, textDecoration: "none" }}>
                {t.nav_register}
              </a>
            </div>
          </div>
        </header>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section style={{ background: "#FFFFFF", padding: "72px 24px 64px", borderBottom: "1px solid rgba(13,37,56,0.07)" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
            <p style={{ margin: "0 0 20px", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2F7A5F" }}>
              Collectible Summit Cards
            </p>
            <h1 style={{ margin: "0 0 18px", fontSize: 44, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.025em" }}>
              {t.hero_title.split("\n").map((line, i) => (
                <span key={i} style={{ color: i === 0 ? "#0D2538" : "#F5A623", display: "block" }}>
                  {line}
                </span>
              ))}
            </h1>
            <p style={{ margin: 0, fontSize: 17, color: "#6B7280", fontWeight: 500, lineHeight: 1.6, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              {t.hero_subtitle}
            </p>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <HowItWorksSteps />

        {/* ── Peaks carousel ───────────────────────────────────────────────── */}
        <section style={{ padding: "32px 0 48px", background: "#F4F7FA" }}>
          <div className="pk-mini-scroll">
            {LANDING_PEAKS.map((peak) => (
              <MiniPeakCard key={peak.peakName} peak={peak} urlPrefix={t.urlPrefix} />
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section style={{ background: "#fff", borderTop: "1px solid rgba(13,37,56,0.07)", padding: "72px 24px", textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#2F7A5F" }}>
            Collectible Summit Cards
          </p>
          <h2 style={{ margin: "0 0 16px", fontSize: 32, fontWeight: 800, color: "#0D2538", letterSpacing: "-0.025em", lineHeight: 1.15 }}>
            {t.cta_heading}
          </h2>
          <p style={{ margin: "0 0 32px", fontSize: 16, color: "#6B7280", maxWidth: 420, marginLeft: "auto", marginRight: "auto", lineHeight: 1.65 }}>
            {t.cta_body}
          </p>
          <a href="/register" className="pk-cta-btn">{t.cta_button}</a>
          <p style={{ marginTop: 14, fontSize: 12, color: "#9CA3AF" }}>{t.cta_micro}</p>
        </section>

        <PeakFooter locale={t.locale} />

      </div>
    </>
  );
}
