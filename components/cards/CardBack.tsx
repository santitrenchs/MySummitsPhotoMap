"use client";

import { PeakMiniMap } from "@/components/cards/PeakMiniMap";
import { ElevationProfile } from "@/components/cards/ElevationProfile";
import { type RarityId, RARITY_COLORS } from "@/lib/rarity";

// ─── CardBack ────────────────────────────────────────────────────────────────
//
// Back-face for AscentCard: map hero + Peakadex stats + optional footer
// (Cordada pills + message blockquote). The caller passes the display name
// (nameEn ?? name) and the footer node.
//
// Usage:
//   <CardBack
//     peak={peak}
//     peakName={peak.nameEn ?? peak.name}
//     rarity={rarity}
//     isFlipped={isFlipped}
//     locale={locale}
//     peakStats={peakStats}
//     footer={<footer className="capture-note">...</footer>}
//   />

type CardBackPeak = {
  id: string;
  name: string;
  altitudeM: number;
  latitude: number;
  longitude: number;
  mountainRange?: string | null;
  isMythic?: boolean | null;
};

type Props = {
  peak: CardBackPeak;
  /** Display name — caller decides whether to prefer nameEn */
  peakName: string;
  rarity: RarityId;
  isFlipped: boolean;
  locale: string;
  peakStats?: { totalAscents: number; uniqueClimbers: number } | null;
  /** Optional footer rendered below the stat band (e.g. byline + description) */
  footer?: React.ReactNode;
  /** i18n key for "Mítico" badge — only needed when isMythic */
  mythicLabel?: string;
};

export function CardBack({
  peak,
  peakName,
  rarity,
  isFlipped,
  locale,
  peakStats,
  footer,
  mythicLabel = "Mítico",
}: Props) {
  const latStr = `${Math.abs(peak.latitude).toFixed(4)}°${peak.latitude >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(peak.longitude).toFixed(4)}°${peak.longitude >= 0 ? "E" : "W"}`;
  const rarityColor = RARITY_COLORS[rarity];

  return (
    <section className="capture-frame">
      <div className="image-frame">
        {isFlipped && (
          <PeakMiniMap
            lat={peak.latitude}
            lng={peak.longitude}
            peakId={peak.id}
            peakName={peak.name}
            altitudeM={peak.altitudeM}
          />
        )}
        <div className="back-map-gradient" />
        {peak.isMythic && (
          <div className="mythic-badge">{mythicLabel}</div>
        )}
        <div className="back-map-data">
          <div className="back-map-geo">📍 {latStr} · {lngStr}</div>
          <div className="back-map-name">{peakName}</div>
          <div className="back-map-alt">{peak.altitudeM.toLocaleString(locale)} m</div>
          {peak.mountainRange && (
            <div className="back-map-zone">{peak.mountainRange}</div>
          )}
        </div>
        {isFlipped && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
            <ElevationProfile
              peakId={peak.id}
              altitudeM={peak.altitudeM}
              rarityColor={rarityColor}
            />
          </div>
        )}
      </div>

      <div className="back-stats-eyebrow">Estadísticas Peakadex</div>
      <div className="stat-band">
        <div className="stat-item">
          <span className="stat-label">Ascensiones</span>
          <div className="stat-value">{peakStats?.totalAscents ?? "—"}</div>
        </div>
        <div className="stat-item" style={{ textAlign: "right" }}>
          <span className="stat-label">Alpinistas</span>
          <div className="stat-value">{peakStats?.uniqueClimbers ?? "—"}</div>
        </div>
      </div>

      {footer}
    </section>
  );
}
