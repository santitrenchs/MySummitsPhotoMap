import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getPublicAscent } from "@/lib/services/public-ascent.service";
import { getRarityId, RARITY_COLORS, RARITY_LABELS, RARITY_EP } from "@/lib/rarity";
import { PeakadexLogo } from "@/components/brand/Logo";
import Link from "next/link";

const APP_URL =
  process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "https://www.peakadex.com";

async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("host");
    if (host) return host.includes("localhost") ? `http://${host}` : `https://${host}`;
  } catch {}
  return APP_URL;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [ascent, baseUrl] = await Promise.all([getPublicAscent(id), getBaseUrl()]);
  if (!ascent) return { title: "Peakadex" };

  const title = `${ascent.user.name} · ${ascent.peak.name} ${ascent.peak.altitudeM} m`;
  const description = ascent.description
    ?? ascent.route
    ?? `${ascent.peak.mountainRange ?? "Mountain"} summit ascent`;

  // Use the ascent photo directly as the OG image — no server-side generation needed.
  // Photos are stored as 4:5 crops on R2 (CDN public URL), accessible to all crawlers.
  // Fallback to the Peakadex logo if the ascent has no photo.
  const ogImage = ascent.photoUrl ?? `${baseUrl}/brand/logo2.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/ascent/${id}`,
      siteName: "Peakadex",
      images: [
        {
          url: ogImage,
          alt: title,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function InitialsAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const parts = name.trim().split(" ");
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (name[0]?.toUpperCase() ?? "?");
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
        color: "white",
        fontSize: size * 0.38,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PublicAscentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ascent = await getPublicAscent(id);
  if (!ascent) notFound();

  const rarity = getRarityId(ascent.peak.altitudeM);
  const rarityColor = RARITY_COLORS[ascent.peak.rarityId ?? rarity] ?? RARITY_COLORS[rarity];
  const rarityLabel = RARITY_LABELS[rarity];
  const rarityEp = RARITY_EP[rarity];

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#EDEEF0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px 48px",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 24 }}>
        <PeakadexLogo height={32} iconScale={0.9} />
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(13,37,56,0.13), 0 1px 4px rgba(13,37,56,0.06)",
        }}
      >
        {/* User header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
          }}
        >
          {ascent.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ascent.user.avatarUrl}
              alt=""
              style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <InitialsAvatar name={ascent.user.name} size={40} />
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0D2538" }}>
              {ascent.user.name}
            </div>
            <div style={{ fontSize: 12, color: "#5A6E84" }}>{formatDate(ascent.date)}</div>
          </div>
        </div>

        {/* Photo */}
        <div style={{ position: "relative", aspectRatio: "4/5", background: "#e2e8f0", overflow: "hidden" }}>
          {ascent.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ascent.photoUrl}
              alt={ascent.peak.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(180deg, #bfdbfe 0%, #dbeafe 100%)" }} />
          )}

          {/* Gradient overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 55%)",
            }}
          />

          {/* Mythic badge */}
          {ascent.peak.isMythic && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(255,215,0,0.95)",
                color: "#7c4900",
                fontSize: 10,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 20,
                letterSpacing: "0.08em",
              }}
            >
              MYTHIC
            </div>
          )}

          {/* Peakadex watermark — top-left */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
              opacity: 0.38,
              pointerEvents: "none",
            }}
          >
            <span style={{ color: "#fff", fontSize: 13, lineHeight: 1, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>✿</span>
            <span style={{
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            }}>
              PEAKADEX
            </span>
          </div>

          {/* Peak info overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "16px",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2, letterSpacing: "-0.3px" }}>
              {ascent.peak.name}
            </div>
            {ascent.route && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
                {ascent.route}
              </div>
            )}
            {ascent.peak.mountainRange && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                {ascent.peak.mountainRange}
              </div>
            )}
          </div>
        </div>

        {/* Stats band */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            padding: "12px 16px",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          {/* Rarity */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Rarity
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: rarityColor + "20",
                borderRadius: 20,
                padding: "3px 8px",
              }}
            >
              <span style={{ color: rarityColor, fontSize: 10 }}>✿</span>
              <span style={{ color: rarityColor, fontSize: 11, fontWeight: 700 }}>{rarityLabel}</span>
            </div>
          </div>

          {/* Altitude */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Altitude
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0D2538" }}>
              {ascent.peak.altitudeM.toLocaleString("en")} m
            </div>
          </div>

          {/* Reward */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Reward
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "#fef3c7",
                borderRadius: 20,
                padding: "3px 8px",
              }}
            >
              <span style={{ color: "#d97706", fontSize: 12, fontWeight: 700 }}>+{rarityEp} EP</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {ascent.description && (
          <div
            style={{
              padding: "12px 16px",
              fontSize: 13,
              color: "#374151",
              lineHeight: 1.6,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            {ascent.description}
          </div>
        )}

        {/* CTA */}
        <div style={{ padding: "20px 16px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center" }}>
            Log your own summits on Peakadex
          </div>
          <Link
            href={`${APP_URL}/register`}
            style={{
              display: "block",
              width: "100%",
              padding: "13px 16px",
              background: "#2F7A5F",
              color: "#fff",
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              textAlign: "center",
              textDecoration: "none",
              letterSpacing: "0.01em",
            }}
          >
            Join Peakadex →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, fontSize: 11, color: "#94A3B8" }}>
        © {new Date().getFullYear()} Peakadex
      </div>
    </div>
  );
}
