import { ImageResponse } from "next/og";
import { getPublicAscent } from "@/lib/services/public-ascent.service";
import { getRarityId, RARITY_COLORS, RARITY_LABELS } from "@/lib/rarity";

export const runtime = "nodejs";
export const revalidate = 86400; // 24h

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ascent = await getPublicAscent(id);

  if (!ascent) {
    // Fallback OG image — Peakadex brand
    return new ImageResponse(
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0D2538 0%, #1e3a5f 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <span style={{ fontSize: 64, fontWeight: 800, color: "#fff" }}>
          Peakadex
        </span>
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const rarity = getRarityId(ascent.peak.altitudeM);
  const rarityColor = RARITY_COLORS[ascent.peak.rarityId ?? rarity] ?? RARITY_COLORS[rarity];
  const rarityLabel = RARITY_LABELS[rarity];

  const dateStr = new Date(ascent.date).toLocaleDateString("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        position: "relative",
        fontFamily: "sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Background photo */}
      {ascent.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ascent.photoUrl}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          alt=""
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, #1e3a5f 0%, #0D2538 100%)",
          }}
        />
      )}

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)",
          display: "flex",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
        }}
      >
        {/* Top: logo + rarity */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.5px" }}>
            🏔 Peakadex
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: rarityColor + "30",
              border: `1.5px solid ${rarityColor}`,
              borderRadius: 30,
              padding: "6px 16px",
            }}
          >
            <span style={{ color: rarityColor, fontSize: 16 }}>✿</span>
            <span style={{ color: rarityColor, fontSize: 16, fontWeight: 700 }}>{rarityLabel}</span>
          </div>
        </div>

        {/* Bottom: peak info + user */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Altitude */}
          <div style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", fontWeight: 600, marginBottom: 8 }}>
            {ascent.peak.altitudeM.toLocaleString("en")} m
            {ascent.peak.mountainRange ? ` · ${ascent.peak.mountainRange}` : ""}
          </div>

          {/* Peak name */}
          <div
            style={{
              fontSize: ascent.peak.name.length > 20 ? 58 : 72,
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1,
              letterSpacing: "-1.5px",
              marginBottom: 24,
            }}
          >
            {ascent.peak.name}
          </div>

          {/* User + date */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {ascent.user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ascent.user.avatarUrl}
                style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
                alt=""
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0369a1, #0ea5e9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {ascent.user.name[0]?.toUpperCase()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                {ascent.user.name}
              </span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
                {dateStr}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
