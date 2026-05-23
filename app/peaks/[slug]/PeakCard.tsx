"use client";

import { useState } from "react";
import type { PeakCardData } from "@/lib/data/landing-peaks";
import { rarityForAlt } from "@/lib/data/landing-peaks";

const CARD_W = 240;
const CARD_H = 410;

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
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 240 200" preserveAspectRatio="xMidYMid slice">
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
      <path d="M0 155 L40 110 L80 130 L130 90 L175 115 L210 85 L240 105 L240 200 L0 200Z" fill={terrainFar} />
      <path d="M30 200 L120 55 L210 200Z" fill={terrainNear} />
      <path d="M120 55 L104 92 L120 84 L136 92Z" fill="rgba(255,255,255,0.88)" />
      <path d="M120 55 L104 92 L120 84Z" fill="rgba(255,255,255,0.25)" />
      <rect width="240" height="200" fill={`url(#ov-${uid})`} />
    </svg>
  );
}

export function PeakCard({ peak, uid, href }: { peak: PeakCardData; uid: string; href?: string }) {
  const [flipped, setFlipped] = useState(false);
  const rarity = rarityForAlt(peak.altitudeM);
  const initials = peak.user.split(" ").map((w: string) => w[0]).join("");
  const latStr = `${Math.abs(peak.lat).toFixed(4)}°${peak.lat >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(peak.lng).toFixed(4)}°${peak.lng >= 0 ? "E" : "W"}`;
  const barPct = Math.min(100, (peak.altitudeM / 8849) * 100).toFixed(1);

  const cardStyle = { width: CARD_W, height: CARD_H, perspective: 1200, cursor: "pointer", flexShrink: 0 } as const;
  const inner = (
      <div style={{
        width: "100%", height: "100%",
        transformStyle: "preserve-3d",
        transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}>

        {/* ── Front ── */}
        <div style={{
          position: "absolute", inset: 0,
          backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          borderRadius: 18, overflow: "hidden",
          background: "#FFFFFF",
          border: "1px solid rgba(13,37,56,0.09)",
          boxShadow: "0 8px 32px rgba(13,37,56,0.14)",
          display: "flex", flexDirection: "column",
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
            <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: 3, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
                {peak.peakName}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
                📍 {latStr} · {lngStr}
              </div>
            </div>
          </div>

          {/* Stat band */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "10px" }}>
            <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>RAREZA</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: rarity.color, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, lineHeight: 1.2 }}>
                ✿ <span>{rarity.name}</span>
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

        {/* ── Back ── */}
        <div style={{
          position: "absolute", inset: 0,
          backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          borderRadius: 18, overflow: "hidden",
          background: "#FFFFFF",
          border: "1px solid rgba(13,37,56,0.09)",
          boxShadow: "0 8px 32px rgba(13,37,56,0.14)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Map top */}
          <div style={{ position: "relative", height: 238, flexShrink: 0, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={peak.mapImg} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)" }} />
            {/* Rarity flower marker — centered on the peak (map image is always centered on the peak) */}
            <div style={{
              position: "absolute",
              top: "38%", left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              width: 80, height: 80,
            }}>
              <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0 }}>
                <circle cx="40" cy="40" r="37" fill="none" stroke={rarity.color} strokeWidth="1" opacity="0.18" />
                <circle cx="40" cy="40" r="30" fill="none" stroke={rarity.color} strokeWidth="1.1" opacity="0.3" />
                <circle cx="40" cy="40" r="22" fill="none" stroke={rarity.color} strokeWidth="1.2" opacity="0.48" />
                <circle cx="40" cy="40" r="14" fill="none" stroke={rarity.color} strokeWidth="1.4" opacity="0.65" />
              </svg>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, color: rarity.color,
                filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
                lineHeight: 1,
              }}>
                ✿
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 14px 12px" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", marginBottom: 5, display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ color: "#ef4444", fontSize: 10 }}>📍</span>
                {latStr} · {lngStr}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.1, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
                {peak.peakName}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.92)", marginTop: 2 }}>
                {peak.altLabel}
              </div>
              {peak.mountainRange && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.50)", marginTop: 2 }}>{peak.mountainRange}</div>
              )}
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 4, background: "rgba(255,255,255,0.18)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${barPct}%`, background: `linear-gradient(to right, ${rarity.color}99, ${rarity.color})`, borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.40)" }}>0 m</span>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.40)" }}>8.849 m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px 0" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: rarity.color, flexShrink: 0 }} />
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(13,37,56,0.38)", textTransform: "uppercase" }}>
                ESTADÍSTICAS
              </span>
            </div>
            <div style={{ display: "flex", borderTop: "1px solid rgba(13,37,56,0.07)", borderBottom: "1px solid rgba(13,37,56,0.07)", margin: "8px 0 0" }}>
              <div style={{ flex: 1, padding: "10px 14px" }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(13,37,56,0.35)", textTransform: "uppercase", marginBottom: 4 }}>ASCENSIONES</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0D2538", lineHeight: 1 }}>{peak.ascents.toLocaleString("es")}</div>
              </div>
              <div style={{ width: 1, background: "rgba(13,37,56,0.07)", margin: "10px 0" }} />
              <div style={{ flex: 1, padding: "10px 14px", textAlign: "right" }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(13,37,56,0.35)", textTransform: "uppercase", marginBottom: 4 }}>ALPINISTAS</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0D2538", lineHeight: 1 }}>{peak.climbers.toLocaleString("es")}</div>
              </div>
            </div>
            <div style={{ padding: "9px 14px 14px", flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>{peak.user}</p>
              <p style={{
                margin: "4px 0 0", fontSize: 10.5, color: "#6B7280", lineHeight: 1.55,
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {peak.message}
              </p>
            </div>
          </div>
        </div>

      </div>
  );

  if (href) {
    return (
      <a href={href} style={{ ...cardStyle, display: "block", textDecoration: "none" }}>
        {inner}
      </a>
    );
  }

  return (
    <div
      style={cardStyle}
      onClick={() => setFlipped((f) => !f)}
      title="Toca para ver el reverso"
    >
      {inner}
    </div>
  );
}
