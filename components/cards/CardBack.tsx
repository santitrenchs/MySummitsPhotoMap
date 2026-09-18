"use client";
import { formatAltitude, type Units } from "@/lib/units";

import { PeakMiniMap } from "@/components/cards/PeakMiniMap";
import { ElevationProfile } from "@/components/cards/ElevationProfile";
import type { ElevationProfile as ElevationProfileData } from "@/lib/services/elevation.service";
import { type RarityId, RARITY_COLORS } from "@/lib/rarity";

// ─── CardBack ────────────────────────────────────────────────────────────────
//
// Back-face for AscentCard: map hero + Peakadex stats + optional footer
// (Cordada pills + message blockquote). The caller passes the display name
// (peakDisplayName) and the footer node.
//
// Usage:
//   <CardBack
//     peak={peak}
//     peakName={peakDisplayName(peak)}
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
  /** Display name — the caller resolves it with `peakDisplayName`. */
  peakName: string;
  rarity: RarityId;
  isFlipped: boolean;
  locale: string;
  /** Display units. A prop, not a hook: the public share page renders this
   *  component outside I18nProvider. Defaults to metric. */
  units?: Units;
  /** "always" forces the thousands separator, for the public share card. */
  grouping?: "auto" | "always";
  peakStats?: { totalAscents: number; uniqueClimbers: number } | null;
  /** Optional footer rendered below the stat band (e.g. byline + description) */
  footer?: React.ReactNode;
  /** i18n key for "Mítico" badge — only needed when isMythic */
  mythicLabel?: string;
  /** Skip nearby-peaks fetch (public share page where /api/peaks isn't accessible). */
  disableNearby?: boolean;
  /** Pre-loaded elevation profile — passed to ElevationProfile to skip its fetch. */
  elevationProfile?: ElevationProfileData | null;
}

export function CardBack({
  peak,
  peakName,
  rarity,
  isFlipped,
  locale,
  units,
  grouping,
  peakStats,
  footer,
  mythicLabel = "Mítico",
  disableNearby = false,
  elevationProfile,
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
            units={units}
            disableNearby={disableNearby}
          />
        )}
        <div className="back-map-gradient" />
        {peak.isMythic && (
          <div className="mythic-badge">{mythicLabel}</div>
        )}
        <div className="back-map-data">
          <div className="back-map-geo">📍 {latStr} · {lngStr}</div>
          <div className="back-map-name">{peakName}</div>
          <div className="back-map-alt">{formatAltitude(peak.altitudeM, { locale, units, grouping })}</div>
          {peak.mountainRange && (
            <div className="back-map-zone">{peak.mountainRange}</div>
          )}
        </div>
        {isFlipped && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
            <ElevationProfile
              units={units}
              peakId={peak.id}
              altitudeM={peak.altitudeM}
              rarityColor={rarityColor}
              profile={elevationProfile}
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
