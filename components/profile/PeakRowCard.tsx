"use client";

import Link from "next/link";
import { RARITY_COLORS } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { RarityFlower } from "@/components/brand/RarityFlowers";
import { CaptureStack } from "./CaptureStack";
import type { PeakForFilter } from "./usePeakFilters";
import { imgUrl } from "@/lib/storage/image-url";

type RarityEntry = { id: string; label: string; color: string; colorDark: string; minAlt: number };

// Get rarity entry from RARITIES array
import { RARITIES } from "@/lib/rarity";

function getRarityEntry(id: RarityId): RarityEntry {
  return RARITIES.find((r) => r.id === id) ?? RARITIES[0];
}

function formatDateShort(date: Date, locale: string): string {
  return new Date(date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "2-digit" });
}

type Props = {
  peak: PeakForFilter;
  dateLocale: string;
};

export function PeakRowCard({ peak, dateLocale }: Props) {
  const r = getRarityEntry(peak.rarityId);

  return (
    <Link href={`/ascents?peak=${peak.id}&view=mine`} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex",
        background: "white",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(13,37,56,0.06)",
        boxShadow: "0 1px 3px rgba(13,37,56,0.06), 0 4px 12px rgba(13,37,56,0.05)",
        overflow: "hidden",
      }}>
        {/* Rarity strip */}
        <div style={{ width: 4, background: r.color, flexShrink: 0 }} />

        {/* Photo */}
        <div style={{ width: 96, flexShrink: 0, position: "relative", overflow: "hidden", background: "#0D2538" }}>
          {peak.firstPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl(peak.firstPhotoUrl, 400)}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, opacity: 0.4,
            }}>
              🏔
            </div>
          )}
          {/* Altitude overlay */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(to top, rgba(13,37,56,0.55) 0%, transparent 55%)",
            padding: "14px 6px 6px",
            textAlign: "center",
          }}>
            <span style={{
              fontFamily: "var(--font-mono-landing, monospace)",
              fontSize: 10, fontWeight: 700, color: "white",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            }}>
              {peak.altitudeM} m
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Header: name + capture stack */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: 14, fontWeight: 700, color: "#0D2538",
              letterSpacing: "-0.015em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              flex: 1, minWidth: 0,
            }}>
              {peak.name}
            </div>
            <div style={{ flexShrink: 0 }}>
              <CaptureStack count={peak.count} rarityId={peak.rarityId} />
            </div>
          </div>

          {/* Rarity pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 7px", borderRadius: "var(--radius-full)",
            background: r.color + "22",
            alignSelf: "flex-start",
          }}>
            <RarityFlower id={r.id} size={11} />
            <span style={{
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: 10, fontWeight: 700,
              color: r.colorDark,
            }}>
              {r.label}
            </span>
          </div>

          {/* Bottom row: dates + range */}
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: "auto", gap: 8 }}>
            {/* Last date */}
            <div>
              <div style={{
                fontFamily: "var(--font-mono-landing, monospace)",
                fontSize: 8, fontWeight: 700, color: "#94A3B8",
                textTransform: "uppercase", letterSpacing: "0.12em",
              }}>
                ÚLTIMA
              </div>
              <div style={{
                fontFamily: "var(--font-mono-landing, monospace)",
                fontSize: 11, fontWeight: 700, color: "#0D2538",
              }}>
                {formatDateShort(peak.lastDate, dateLocale)}
              </div>
            </div>
            {/* First date (only if climbed >1 time) */}
            {peak.count > 1 && (
              <div>
                <div style={{
                  fontFamily: "var(--font-mono-landing, monospace)",
                  fontSize: 8, fontWeight: 700, color: "#94A3B8",
                  textTransform: "uppercase", letterSpacing: "0.12em",
                }}>
                  PRIMERA
                </div>
                <div style={{
                  fontFamily: "var(--font-mono-landing, monospace)",
                  fontSize: 11, fontWeight: 700, color: "#0D2538",
                }}>
                  {formatDateShort(peak.firstDate, dateLocale)}
                </div>
              </div>
            )}
            <div style={{ flex: 1 }} />
            {peak.mountainRange && (
              <span style={{
                fontFamily: "var(--font-mono-landing, monospace)",
                fontSize: 10, fontWeight: 600, color: "#CBD5E1",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                maxWidth: 80,
              }}>
                {peak.mountainRange}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
