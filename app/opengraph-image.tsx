import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RARITIES = ["#00995C", "#A855F7", "#3B82F6", "#F97316", "#EAB308", "#FFD700"];

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        background: "linear-gradient(160deg, #080F1A 0%, #0D2538 50%, #080F1A 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background:
            "linear-gradient(90deg, transparent 0%, #00995C 40%, #00995C 60%, transparent 100%)",
          display: "flex",
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          marginBottom: 36,
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            border: "3px solid #00995C",
            background: "rgba(0,153,92,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 42,
            color: "#00995C",
            lineHeight: 1,
          }}
        >
          ✿
        </div>
        <span
          style={{
            fontSize: 62,
            fontWeight: 800,
            color: "#F1F5F9",
            letterSpacing: "-2px",
            lineHeight: 1,
          }}
        >
          Peakadex
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 24,
          color: "rgba(255,255,255,0.52)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        Capture summits · Collect rarities · Become Legendary
      </div>

      {/* Rarity dots */}
      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: 52,
          alignItems: "center",
        }}
      >
        {RARITIES.map((color, i) => (
          <div
            key={i}
            style={{
              width: i === 5 ? 44 : 32,
              height: i === 5 ? 44 : 32,
              borderRadius: "50%",
              background: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: i === 5 ? 22 : 16,
              color: "rgba(0,0,0,0.55)",
            }}
          >
            ✿
          </div>
        ))}
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background:
            "linear-gradient(90deg, transparent 0%, #00995C 40%, #00995C 60%, transparent 100%)",
          display: "flex",
        }}
      />
    </div>,
    { width: 1200, height: 630 },
  );
}
