import type { PeakChallenge } from "@/lib/data/peak-challenges";
import type { PeakLocale } from "@/lib/i18n/peaks";
import { fill, getPeakChallengeLabels } from "@/lib/i18n/peak-content";

/**
 * "Retos de Peakadex" — the block that tells a visitor the summit they are
 * reading about belongs to a challenge, and what a challenge is.
 *
 * The patch (`coverUrl`) leads: it is the collectible object, and this whole
 * site is photo-first. It renders `object-fit: contain` and is NEVER clipped to
 * a circle — the artwork carries its own ring and a circular clip shaves it off
 * (same rule as the Retos list, see CLAUDE.md).
 *
 * One challenge → a single 208px patch beside the copy.
 * Several       → 132px patches in a two-column grid, because the headline's
 *                 claim ("counts towards 2 challenges") IS the two patches.
 *
 * Renders nothing when the peak is in no challenge.
 */
export function PeakChallenges({
  peakName,
  challenges,
  locale,
}: {
  peakName: string;
  challenges: PeakChallenge[];
  locale: PeakLocale;
}) {
  if (challenges.length === 0) return null;

  const t = getPeakChallengeLabels(locale);
  const many = challenges.length > 1;
  const n = challenges.length;

  // The heading is one template with the accented part as a token, so every
  // locale decides where that part falls in the sentence.
  const headingTemplate = many ? t.headingMany : t.headingOne;
  const accent = many
    ? fill(t.manyHighlight, { n })
    : challenges[0].name[locale];
  const token = many ? "{highlight}" : "{challenge}";
  const [beforeRaw, afterRaw] = headingTemplate.split(token);
  const before = fill(beforeRaw ?? "", { peak: peakName });
  const after = fill(afterRaw ?? "", { peak: peakName });

  return (
    <section style={{ background: "#F4F7FA", padding: "56px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: many ? 30 : 32 }}>

        {many ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={eyebrowStyle}>{t.eyebrow}</p>
            <h2 style={headingStyle}>
              {before}<span style={{ color: "#F5A623" }}>{accent}</span>{after}
            </h2>
            <p style={{ ...bodyStyle, maxWidth: 620 }}>{fill(t.introMany, { n })}</p>
          </div>
        ) : (
          <p style={eyebrowStyle}>{t.eyebrow}</p>
        )}

        {many ? (
          <div className="pk-challenge-grid">
            {challenges.map((c) => (
              <div key={c.slug} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <Patch challenge={c} size={132} alt={c.name[locale]} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={nameStyle}>{c.name[locale]}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "#6B7280" }}>{c.description[locale]}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pk-challenge-hero">
            <Patch challenge={challenges[0]} size={208} alt={challenges[0].name[locale]} />
            <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 style={headingStyle}>
                {before}<span style={{ color: "#F5A623" }}>{accent}</span>{after}
              </h2>
              <p style={bodyStyle}>{challenges[0].description[locale]} {t.introSuffixOne}</p>
              <InList
                text={fill(t.inListOne, { peak: peakName, count: challenges[0].peakCount })}
                size={14}
              />
            </div>
          </div>
        )}

        <div className="pk-challenge-steps">
          <Step n={1} title={t.step1Title} body={t.step1Body} />
          <Step n={2} title={t.step2Title} body={t.step2Body} />
          <Step
            n={3}
            title={t.step3Title}
            body={many ? fill(t.step3BodyMany, { n }) : t.step3BodyOne}
          />
        </div>

        <a href="/register" style={{ ...ctaStyle, alignSelf: "flex-start" }}>
          {many ? t.ctaMany : t.ctaOne}
        </a>

      </div>
    </section>
  );
}

function Patch({ challenge, size, alt }: { challenge: PeakChallenge; size: number; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={challenge.coverUrl}
      alt={alt}
      loading="lazy"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        objectFit: "contain",
        filter: `drop-shadow(0 ${size > 160 ? 10 : 8}px ${size > 160 ? 24 : 20}px rgba(13,37,56,0.20))`,
      }}
    />
  );
}

function InList({ text, size = 13 }: { text: string; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size > 13 ? 7 : 6, fontSize: size, fontWeight: 600, color: "#2F7A5F" }}>
      <svg width={size + 1} height={size + 1} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {text}
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", background: "#0D2538", color: "#FFFFFF",
        fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
      }}>{n}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0D2538" }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: "#6B7280" }}>{body}</div>
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "#2F7A5F",
} as const;

const headingStyle = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
  lineHeight: 1.2,
  letterSpacing: "-0.02em",
  color: "#0D2538",
} as const;

const nameStyle = {
  fontSize: 17,
  fontWeight: 800,
  letterSpacing: "-0.01em",
  color: "#0D2538",
} as const;

const bodyStyle = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.6,
  color: "#4B5563",
} as const;

const ctaStyle = {
  display: "inline-block",
  background: "#2F7A5F",
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  padding: "13px 28px",
  borderRadius: 99,
  textDecoration: "none",
} as const;
