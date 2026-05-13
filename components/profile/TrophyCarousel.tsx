"use client";

import { useRef, useState, useEffect } from "react";
import { RARITIES, RARITY_COLORS, RARITY_LABELS } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { RarityFlower } from "@/components/brand/RarityFlowers";
import { useT } from "@/components/providers/I18nProvider";
import type { PeakForFilter } from "./usePeakFilters";

type Trophy = {
  id: string;
  eyebrow: string;
  peak: PeakForFilter;
  accent: string;
  highlightLabel: string;
  highlightValue: string;
};

function buildTrophies(peaks: PeakForFilter[], t: ReturnType<typeof useT>): Trophy[] {
  if (peaks.length === 0) return [];

  const trophies: Trophy[] = [];

  // Most climbed
  const most = [...peaks].sort((a, b) => b.count - a.count || b.altitudeM - a.altitudeM)[0];
  trophies.push({
    id: "most",
    eyebrow: `★  ${t.profile_trophy_mostClimbed.toUpperCase()}`,
    peak: most,
    accent: "#FF5D2D",
    highlightLabel: t.profile_trophy_label_ascents,
    highlightValue: `×${most.count}`,
  });

  // Highest
  const highest = [...peaks].sort((a, b) => b.altitudeM - a.altitudeM)[0];
  trophies.push({
    id: "alt",
    eyebrow: `⛰  ${t.profile_trophy_highest.toUpperCase()}`,
    peak: highest,
    accent: RARITY_COLORS[highest.rarityId] ?? "#0E7490",
    highlightLabel: t.profile_trophy_label_altitude,
    highlightValue: `${highest.altitudeM} m`,
  });

  // Most recent
  const recent = [...peaks].sort(
    (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()
  )[0];
  trophies.push({
    id: "recent",
    eyebrow: `◐  ${t.profile_trophy_recent.toUpperCase()}`,
    peak: recent,
    accent: "#2F7A5F",
    highlightLabel: t.profile_trophy_label_conquered,
    highlightValue: formatDateShort(recent.lastDate),
  });

  return trophies;
}

function formatDateShort(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("es", { day: "numeric", month: "short", year: "2-digit" });
}

export function TrophyCarousel({ peaks }: { peaks: PeakForFilter[] }) {
  const t = useT();
  const trophies = buildTrophies(peaks, t);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      setActiveIdx(Math.round(el!.scrollLeft / el!.clientWidth));
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (trophies.length === 0) return null;

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Scroll container */}
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
        className="scroll-snap-hide-bar"
      >
        {trophies.map((trophy, idx) => (
          <div
            key={trophy.id}
            style={{
              flex: "0 0 100%",
              scrollSnapAlign: "start",
              padding: "0 16px",
            }}
          >
            <TrophyHeroCard trophy={trophy} index={idx} total={trophies.length} />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
        {trophies.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              scrollRef.current?.scrollTo({ left: scrollRef.current.clientWidth * idx, behavior: "smooth" });
            }}
            style={{
              width: activeIdx === idx ? 22 : 6,
              height: 6,
              borderRadius: 999,
              background: activeIdx === idx ? "#0D2538" : "rgba(13,37,56,0.22)",
              border: "none",
              padding: 0,
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
            aria-label={`Trophy ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function TrophyHeroCard({ trophy, index, total }: { trophy: Trophy; index: number; total: number }) {
  const rarityColor = RARITY_COLORS[trophy.peak.rarityId] ?? "#94A3B8";
  const rarityLabel = RARITY_LABELS[trophy.peak.rarityId as RarityId] ?? trophy.peak.rarityId;
  const highlightLong = trophy.highlightValue.length > 7;

  return (
    <div style={{
      background: "white",
      borderRadius: 18,
      padding: 14,
      border: "1px solid rgba(13,37,56,0.07)",
      boxShadow: "0 1px 3px rgba(13,37,56,0.06), 0 12px 32px rgba(13,37,56,0.10)",
      display: "flex",
      gap: 14,
    }}>
      {/* Left: photo */}
      <div style={{ position: "relative", flexShrink: 0, width: 84, height: 108 }}>
        <div style={{
          width: 84, height: 108, borderRadius: 10,
          background: "#0D2538",
          overflow: "hidden",
        }}>
          {trophy.peak.firstPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trophy.peak.firstPhotoUrl}
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
        </div>
        {/* Rarity flower badge */}
        <div style={{
          position: "absolute", top: -4, right: -4,
          width: 28, height: 28, borderRadius: "50%",
          background: "white",
          boxShadow: "0 2px 8px rgba(13,37,56,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <RarityFlower id={trophy.peak.rarityId} size={20} />
        </div>
      </div>

      {/* Right: content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Eyebrow + counter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{
            fontFamily: "var(--font-mono-landing, monospace)",
            fontSize: 9, fontWeight: 700,
            color: trophy.accent,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}>
            {trophy.eyebrow}
          </span>
          <span style={{
            fontFamily: "var(--font-mono-landing, monospace)",
            fontSize: 9, fontWeight: 700, color: "#CBD5E1",
          }}>
            {index + 1}/{total}
          </span>
        </div>

        {/* Peak name */}
        <div style={{
          fontFamily: "var(--font-space-grotesk, sans-serif)",
          fontSize: 17, fontWeight: 700, color: "#0D2538",
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          marginBottom: 4,
        }}>
          {trophy.peak.name}
        </div>

        {/* Altitude + rarity */}
        <div style={{
          fontFamily: "var(--font-mono-landing, monospace)",
          fontSize: 11, fontWeight: 700,
          color: rarityColor,
        }}>
          {trophy.peak.altitudeM} m · {rarityLabel}
        </div>

        <div style={{ flex: 1 }} />

        {/* Hero stat row */}
        <div style={{
          borderTop: "1px dashed #E5E7EB",
          paddingTop: 10, marginTop: 10,
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        }}>
          <div>
            {trophy.peak.mountainRange && (
              <div style={{
                fontFamily: "var(--font-mono-landing, monospace)",
                fontSize: 9, fontWeight: 700, color: "#94A3B8",
                textTransform: "uppercase", letterSpacing: "0.14em",
                marginBottom: 2,
              }}>
                {trophy.peak.mountainRange}
              </div>
            )}
            <div style={{
              fontFamily: "var(--font-mono-landing, monospace)",
              fontSize: 10, fontWeight: 600, color: "#5A6E84",
            }}>
              {trophy.peak.country ?? ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontFamily: "var(--font-mono-landing, monospace)",
              fontSize: 9, fontWeight: 700, color: "#94A3B8",
              textTransform: "uppercase", letterSpacing: "0.14em",
              marginBottom: 2,
            }}>
              {trophy.highlightLabel}
            </div>
            <div style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: highlightLong ? 20 : 28,
              fontWeight: 800,
              color: trophy.accent,
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}>
              {trophy.highlightValue}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
