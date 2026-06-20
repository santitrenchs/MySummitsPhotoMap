"use client";

import { useState } from "react";
import Link from "next/link";
import { CardBack } from "@/components/cards/CardBack";
import { getRarityId, RARITY_COLORS, RARITY_LABELS, RARITY_EP, type RarityId } from "@/lib/rarity";
import { peakDisplayName } from "@/lib/peak-name";
import type { ElevationProfile as ElevationProfileData } from "@/lib/services/elevation.service";

export type ShareCardData = {
  ascentId: string;
  dateStr: string;
  route: string | null;
  description: string | null;
  peak: {
    id: string;
    name: string;
    nameEn: string | null;
    altitudeM: number;
    mountainRange: string | null;
    isMythic: boolean;
    rarityId: string | null;
    latitude: number;
    longitude: number;
    elevationProfile: ElevationProfileData | null;
  };
  photoUrl: string | null;
  ownerName: string;
  ownerAvatarUrl: string | null;
  persons: { id: string; name: string }[];
  peakStats: { totalAscents: number; uniqueClimbers: number } | null;
  isLandscape: boolean;
  locale: string;
  registerUrl: string;
  labels: {
    rarity: string;
    altitude: string;
    reward: string;
    mythic: string;
    joinCta: string;
    cordada: string;
    tapToFlip: string;
    cairn: string;
  };
};

function InitialsAvatar({ name, size }: { name: string; size: number }) {
  const parts = name.trim().split(" ");
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (name[0]?.toUpperCase() ?? "?");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
      color: "white", fontSize: size * 0.38, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export function ShareCard(props: ShareCardData) {
  const { peak, labels, locale } = props;
  const peakName = peakDisplayName(peak);
  const [isFlipped, setIsFlipped] = useState(false);

  const rarity: RarityId = getRarityId(peak.altitudeM);
  const rarityColor = RARITY_COLORS[(peak.rarityId as RarityId) ?? rarity] ?? RARITY_COLORS[rarity];
  const rarityLabel = RARITY_LABELS[rarity];
  const rarityEp = RARITY_EP[rarity];

  // Cordada members: owner + tagged people (this is "someone else's" card → show everyone).
  const cordadaMembers = [
    { key: "__owner__", name: props.ownerName },
    ...props.persons.map((p) => ({ key: p.id, name: p.name })),
  ];

  const front = (
    <>
      {/* User header — reuses the app's .card-user / .user-name / .user-date styles */}
      <header className="card-user">
        {props.ownerAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.ownerAvatarUrl} alt="" className="pc-avatar" style={{ objectFit: "cover" }} />
        ) : (
          <InitialsAvatar name={props.ownerName} size={32} />
        )}
        <div className="user-copy">
          <div className="user-name">{props.ownerName}</div>
          <div className="user-date">{props.dateStr}</div>
        </div>
        <Link
          href={props.registerUrl}
          onClick={(e) => e.stopPropagation()}
          style={{
            flexShrink: 0, padding: "7px 14px", background: "#2F7A5F", color: "#fff",
            borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 700,
            textDecoration: "none", letterSpacing: "0.01em", whiteSpace: "nowrap",
          }}
        >
          {labels.joinCta}
        </Link>
      </header>

      {/* Photo */}
      <div style={{ padding: "6px 10px" }}>
        <div style={{ position: "relative", aspectRatio: "4/5", background: "#e2e8f0", overflow: "hidden", borderRadius: "var(--radius-xl)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)" }}>
          {props.photoUrl ? (
            props.isLandscape ? (
              <>
                <div style={{ position: "absolute", inset: 0, backgroundImage: `url("${props.photoUrl}")`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(24px)", transform: "scale(1.1)" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={props.photoUrl} alt={peakName} style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain", display: "block", zIndex: 1 }} />
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.photoUrl} alt={peakName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(180deg, #bfdbfe 0%, #dbeafe 100%)" }} />
          )}

          {/* Gradient overlay */}
          <div style={{ position: "absolute", inset: 0, zIndex: 2, background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 55%)" }} />

          {/* Mythic badge */}
          {peak.isMythic && (
            <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(234,179,8,0.95)", color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", padding: "6px 10px", borderRadius: "var(--radius-full)", boxShadow: "0 8px 24px rgba(234,179,8,0.35)", zIndex: 2 }}>
              {labels.mythic}
            </div>
          )}

          {/* Peakadex watermark */}
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", opacity: 0.8, pointerEvents: "none", filter: "drop-shadow(0px 1px 6px rgba(0,0,0,0.7))", fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap", zIndex: 2 }}>
            <span style={{ color: "#fff", marginRight: 5 }}>peak</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" width={22} height={22} alt="" style={{ display: "block", flexShrink: 0, filter: "brightness(0) invert(1)", transform: "translateY(1px)" }} />
            <span style={{ color: "#fff", marginLeft: 5 }}>adex</span>
          </div>

          {/* Peak info */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, zIndex: 3 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2, letterSpacing: "-0.3px" }}>{peakName}</div>
            {props.route && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>{props.route}</div>}
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
              {`${Math.abs(peak.latitude).toFixed(4)}°${peak.latitude >= 0 ? "N" : "S"}`}
              {" · "}
              {`${Math.abs(peak.longitude).toFixed(4)}°${peak.longitude >= 0 ? "E" : "W"}`}
            </div>
          </div>
        </div>
      </div>

      {/* Stats band */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "0 12px 12px" }}>
        <StatCell label={labels.rarity}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: rarityColor + "20", borderRadius: "var(--radius-full)", padding: "3px 8px" }}>
            <span style={{ color: rarityColor, fontSize: 10 }}>✿</span>
            <span style={{ color: rarityColor, fontSize: 11, fontWeight: 700 }}>{rarityLabel}</span>
          </div>
        </StatCell>
        <StatCell label={labels.altitude}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0D2538" }}>{peak.altitudeM.toLocaleString("en")} m</div>
        </StatCell>
        <StatCell label={labels.reward}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fef3c7", borderRadius: "var(--radius-full)", padding: "3px 8px", whiteSpace: "nowrap" }}>
            <span style={{ color: "#d97706", fontSize: 13, fontWeight: 700 }}>+{rarityEp} EP</span>
          </div>
        </StatCell>
      </div>
    </>
  );

  return (
    <>
      <div
        className={`flip-card${isFlipped ? " is-flipped" : ""}`}
        onClick={() => setIsFlipped((f) => !f)}
        style={{ width: "100%", maxWidth: 496 }}
      >
        <article className={`peak-card ${rarity} flip-inner`}>
          <div className="card-face card-front">{front}</div>
          <div className="card-face card-back">
            <CardBack
              peak={{ id: peak.id, name: peak.name, altitudeM: peak.altitudeM, latitude: peak.latitude, longitude: peak.longitude, mountainRange: peak.mountainRange, isMythic: peak.isMythic }}
              peakName={peakName}
              rarity={rarity}
              isFlipped={isFlipped}
              locale={locale}
              peakStats={props.peakStats}
              mythicLabel={labels.mythic}
              disableNearby
              elevationProfile={peak.elevationProfile}
              footer={
                <footer className="capture-note" style={{ borderTop: "none" }}>
                  {cordadaMembers.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: props.description ? 8 : 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280" }}>{labels.cordada}</span>
                      {cordadaMembers.map((m) => (
                        <span key={m.key} style={{ fontSize: 11, fontWeight: 600, color: "#111827", background: rarityColor + "1F", borderRadius: "var(--radius-full)", padding: "3px 9px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                      ))}
                    </div>
                  )}
                  {props.description && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: rarityColor, flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: 13, fontStyle: "italic", color: "#6B7280", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{props.description}</p>
                    </div>
                  )}
                </footer>
              }
            />
          </div>
        </article>
      </div>
      <p style={{ marginTop: 14, fontSize: 13, color: "#5A6E84", textAlign: "center" }}>{labels.tapToFlip}</p>
    </>
  );
}

function StatCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "#F8FAFC", borderRadius: "var(--radius-md)", padding: "8px 6px" }}>
      <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>{label}</div>
      {children}
    </div>
  );
}
