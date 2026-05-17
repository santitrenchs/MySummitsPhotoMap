import { ImageResponse } from "next/og";
import type { PublicAscentData } from "@/lib/services/public-ascent.service";

/**
 * Edge runtime uses WASM-based resvg (bundled with next/og) — no native
 * binaries, works reliably on Railway. The nodejs runtime uses @resvg/resvg-js
 * whose native binary crashes on Railway's Linux environment.
 *
 * Because edge cannot use Prisma directly, ascent data is fetched from the
 * lightweight /api/og-data/[id] Node.js endpoint.
 */
export const runtime = "edge";
export const revalidate = 86400; // 24h

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BASE_URL =
  process.env.APP_URL ??
  process.env.NEXTAUTH_URL ??
  "https://www.peakadex.com";

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch ascent data from our Node.js endpoint (edge can't use Prisma directly)
  let ascent: PublicAscentData | null = null;
  try {
    const res = await fetch(`${BASE_URL}/api/og-data/${id}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) ascent = await res.json();
  } catch {
    // fall through to brand fallback
  }

  if (!ascent) {
    // Fallback — brand-only image
    return new ImageResponse(
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(160deg, #0D2538 0%, #1a3a5c 50%, #0D2538 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 64, color: "#fff", lineHeight: 1 }}>✿</span>
          <span style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>
            Peakadex
          </span>
        </div>
      </div>,
      { width: 1200, height: 630 }
    );
  }

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        position: "relative",
        fontFamily: "sans-serif",
        overflow: "hidden",
        background: "#0D2538",
      }}
    >
      {/* Full-frame mountain photo */}
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
            background: "linear-gradient(160deg, #1e3a5f 0%, #0D2538 100%)",
          }}
        />
      )}

      {/* Subtle bottom gradient — only for text/watermark readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.15) 38%, rgba(0,0,0,0) 60%)",
          display: "flex",
        }}
      />

      {/* Peak name + altitude — bottom-left, elegant */}
      <div
        style={{
          position: "absolute",
          bottom: 44,
          left: 56,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: ascent.peak.name.length > 22 ? 46 : 54,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.05,
            letterSpacing: "-0.8px",
          }}
        >
          {ascent.peak.name}
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "rgba(255,255,255,0.72)",
            letterSpacing: "0.02em",
          }}
        >
          {ascent.peak.altitudeM.toLocaleString("en")} m
          {ascent.peak.mountainRange ? `  ·  ${ascent.peak.mountainRange}` : ""}
        </div>
      </div>

      {/* Peakadex watermark — bottom-right, tasteful */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 48,
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: 0.30,
        }}
      >
        <span
          style={{
            fontSize: 22,
            color: "#fff",
            lineHeight: 1,
          }}
        >
          ✿
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          PEAKADEX
        </span>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
