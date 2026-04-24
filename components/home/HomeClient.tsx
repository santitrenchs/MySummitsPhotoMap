"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HomeData } from "@/lib/services/home.service";
import type { Dict } from "@/lib/i18n/types";
import { i } from "@/lib/i18n";

// ─── Level system ─────────────────────────────────────────────────────────────

type AltReq = { threshold: number; count: number };
type LevelDef = {
  idx: number;
  emoji: string;
  nameKey: keyof Dict;
  targetAscents?: number;
  altReqs?: AltReq[];
  quoteKey?: keyof Dict;
  heroBg?: string;
};

const LEVEL_DEFS: LevelDef[] = [
  { idx: 1, emoji: "🌱", nameKey: "home_level1", targetAscents: 5,  altReqs: [{ threshold: 1000, count: 1 }] },
  { idx: 2, emoji: "🥾", nameKey: "home_level2", targetAscents: 15, altReqs: [{ threshold: 2000, count: 1 }] },
  { idx: 3, emoji: "🧭", nameKey: "home_level3", targetAscents: 40, altReqs: [{ threshold: 3000, count: 1 }] },
  { idx: 4, emoji: "🏔️", nameKey: "home_level4", targetAscents: 70, altReqs: [{ threshold: 4000, count: 1 }] },
  { idx: 5, emoji: "👑", nameKey: "home_level5", quoteKey: "home_level5Quote", heroBg: "/levels/messner.jpeg" },
];

function getAltCount(stats: HomeData["stats"], threshold: number): number {
  if (threshold >= 5000) return stats.peaks5000plus;
  if (threshold >= 4000) return stats.peaks4000plus;
  if (threshold >= 3000) return stats.peaks3000plus;
  if (threshold >= 2000) return stats.peaks2000plus;
  return stats.peaks1000plus;
}

function meetsLevel(def: LevelDef, n: number, stats: HomeData["stats"]): boolean {
  if (def.targetAscents == null) return true;
  if (n < def.targetAscents) return false;
  return !def.altReqs || def.altReqs.every((r) => getAltCount(stats, r.threshold) >= r.count);
}

function getLevelState(stats: HomeData["stats"]) {
  let currentIdx = LEVEL_DEFS.length - 1;
  for (let i = 0; i < LEVEL_DEFS.length - 1; i++) {
    if (!meetsLevel(LEVEL_DEFS[i], stats.totalAscents, stats)) {
      currentIdx = i;
      break;
    }
  }
  const current = LEVEL_DEFS[currentIdx];
  const next = currentIdx < LEVEL_DEFS.length - 1 ? LEVEL_DEFS[currentIdx + 1] : null;
  return { currentIdx, current, next, isMaxLevel: currentIdx === LEVEL_DEFS.length - 1 };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}`;
}

function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0]?.toUpperCase() ?? "?";
}

type Badge = {
  id: string; emoji: string;
  titleKey: keyof Dict; subKey: keyof Dict;
  howTo: string; rarity: string; cairns: number;
  earned: boolean; current: number; target: number;
};

function computeBadges(stats: HomeData["stats"]): Badge[] {
  return [
    { id: "first_capture",       emoji: "📍", titleKey: "home_badge1Title", subKey: "home_badge1Sub", howTo: "Capture your first summit",         rarity: "Any",          cairns: 3,  earned: stats.totalAscents  >= 1, current: stats.totalAscents,  target: 1 },
    { id: "trail_starter",       emoji: "🌿", titleKey: "home_badge2Title", subKey: "home_badge2Sub", howTo: "Capture 3 summits",                 rarity: "🟢 Daisy",     cairns: 5,  earned: stats.totalAscents  >= 3, current: stats.totalAscents,  target: 3 },
    { id: "ridge_seeker",        emoji: "⛰️", titleKey: "home_badge3Title", subKey: "home_badge3Sub", howTo: "Capture 3 summits above 1000 m",    rarity: "🔵 Lavender",  cairns: 8,  earned: stats.peaks1000plus >= 3, current: stats.peaks1000plus, target: 3 },
    { id: "alpine_breakthrough", emoji: "🧊", titleKey: "home_badge4Title", subKey: "home_badge4Sub", howTo: "Capture your first 2000 m summit",  rarity: "🟣 Gentian",   cairns: 12, earned: stats.peaks2000plus >= 1, current: stats.peaks2000plus, target: 1 },
    { id: "summit_hunter",       emoji: "🏔️", titleKey: "home_badge5Title", subKey: "home_badge5Sub", howTo: "Capture your first 3000 m summit",  rarity: "🟠 Edelweiss", cairns: 20, earned: stats.peaks3000plus >= 1, current: stats.peaks3000plus, target: 1 },
    { id: "sky_chaser",          emoji: "🌌", titleKey: "home_badge6Title", subKey: "home_badge6Sub", howTo: "Capture a 4000+ m summit",          rarity: "🟡 Saxifrage", cairns: 35, earned: stats.peaks4000plus >= 1, current: stats.peaks4000plus, target: 1 },
  ];
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, url, size = 44 }: { name: string; url: string | null; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
      color: "white", fontSize: size * 0.36, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      boxShadow: "0 0 0 2px rgba(255,255,255,0.3)",
    }}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initials(name)}
    </div>
  );
}

// ─── Level color palette (one entry per level, index = def.idx - 1) ──────────

const LEVEL_COLORS = [
  { accent: "#16a34a", light: "#f0fdf4", mid: "#dcfce7", dark: "#166534" }, // 1 Scout    — green
  { accent: "#d97706", light: "#fffbeb", mid: "#fef3c7", dark: "#92400e" }, // 2 Guide    — amber
  { accent: "#ea580c", light: "#fff7ed", mid: "#ffedd5", dark: "#9a3412" }, // 3 Explorer — orange
  { accent: "#1d4ed8", light: "#eff6ff", mid: "#dbeafe", dark: "#1e40af" }, // 4 Master   — blue
  { accent: "#7c3aed", light: "#faf5ff", mid: "#ede9fe", dark: "#5b21b6" }, // 5 Legendary — purple
];

// ─── Level icon (sprite sheet: /brand/Niveles Peakadex.png, 230×64, 5 slots × 46px) ──

const LEVEL_SPRITE_SLOT = 46;

function LevelIcon({ idx }: { idx: number }) {
  const x = -(idx - 1) * LEVEL_SPRITE_SLOT;
  return (
    <div style={{
      width: LEVEL_SPRITE_SLOT, height: 64, flexShrink: 0,
      backgroundImage: "url('/brand/Niveles Peakadex.png')",
      backgroundSize: "230px 64px",
      backgroundPosition: `${x}px 0`,
      backgroundRepeat: "no-repeat",
    }} />
  );
}

// ─── Level card ───────────────────────────────────────────────────────────────

function LevelCard({ def, status, stats, t, locale }: {
  def: LevelDef;
  status: "completed" | "current" | "locked";
  stats: HomeData["stats"];
  t: Dict;
  locale: string;
}) {
  const isCompleted = status === "completed";
  const isCurrent   = status === "current";
  const color       = LEVEL_COLORS[def.idx - 1];
  const ascentPct   = def.targetAscents
    ? Math.min(stats.totalAscents / def.targetAscents * 100, 100)
    : 100;

  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "16px 14px",
      background: isCurrent ? "#eff6ff" : isCompleted ? color.light : "white",
      borderTop:    `1.5px solid ${isCompleted ? color.mid : isCurrent ? "#bfdbfe" : "#e5e7eb"}`,
      borderRight:  `1.5px solid ${isCompleted ? color.mid : isCurrent ? "#bfdbfe" : "#e5e7eb"}`,
      borderBottom: `1.5px solid ${isCompleted ? color.mid : isCurrent ? "#bfdbfe" : "#e5e7eb"}`,
      borderLeft:   isCurrent ? `4px solid #0369a1` : `1.5px solid ${isCompleted ? color.mid : "#e5e7eb"}`,
      borderRadius: 16,
      boxShadow: isCurrent ? "0 2px 12px rgba(3,105,161,0.10)" : "0 1px 3px rgba(0,0,0,0.04)",
      opacity: status === "locked" ? 0.5 : 1,
      marginBottom: 10,
    }}>

      {/* Left badge: ✓ (level color) or number (blue / gray) */}
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        marginTop: 18,
        background: isCompleted ? color.accent : isCurrent ? "#0369a1" : "#d1d5db",
        color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isCompleted ? 13 : 11, fontWeight: 800,
      }}>
        {isCompleted ? "✓" : def.idx}
      </div>

      {/* Sprite icon — locked keeps natural colors, card opacity does the dimming */}
      <LevelIcon idx={def.idx} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Name + status tag */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 7 }}>
          <span style={{
            fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em",
            color: isCurrent ? "#0369a1" : "#111827",
          }}>
            {t[def.nameKey] as string}
          </span>
          {isCompleted && (
            <span style={{
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              background: color.mid, color: color.dark,
              padding: "3px 10px", borderRadius: 20,
            }}>✓ Completed</span>
          )}
          {isCurrent && (
            <span style={{
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              background: "#dbeafe", color: "#0369a1",
              padding: "3px 10px", borderRadius: 20,
            }}>Current Level</span>
          )}
          {status === "locked" && (
            <span style={{ fontSize: 18, color: "#d1d5db", flexShrink: 0, lineHeight: 1 }}>🔒</span>
          )}
        </div>

        {/* Requirement pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: isCurrent ? 12 : 0 }}>
          {def.targetAscents != null && (
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
              background: isCompleted ? color.mid : "#f3f4f6",
              color: isCompleted ? color.dark : "#374151",
            }}>
              {def.targetAscents} {t.home_statSummits.toLowerCase()}
            </span>
          )}
          {def.altReqs?.map((r) => {
            const met = getAltCount(stats, r.threshold) >= r.count;
            const label = r.count === 1
              ? i(t.home_altReq, { m: r.threshold.toLocaleString(locale) })
              : i(t.home_altReqMulti, { n: r.count, m: r.threshold.toLocaleString(locale) });
            return (
              <span key={r.threshold} style={{
                fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
                background: isCompleted ? color.mid : met ? "#f0fdf4" : "#f3f4f6",
                color: isCompleted ? color.dark : met ? "#16a34a" : "#374151",
              }}>
                {label}
              </span>
            );
          })}
        </div>

        {/* Progress (current only) */}
        {isCurrent && def.targetAscents != null && (
          <>
            <div style={{ height: 6, borderRadius: 99, background: "#dbeafe", overflow: "hidden", marginBottom: 6 }}>
              <div style={{
                height: "100%", borderRadius: 99, width: `${ascentPct}%`,
                background: "linear-gradient(90deg,#0369a1,#0ea5e9)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0369a1" }}>
                {i(t.home_levelProgress, { current: stats.totalAscents, total: def.targetAscents })}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0369a1" }}>
                {Math.round(ascentPct)}%
              </span>
            </div>
            {stats.totalAscents < def.targetAscents && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                → {i(t.home_levelNeedSummits, { n: def.targetAscents - stats.totalAscents })}
              </div>
            )}
            {def.altReqs?.filter((r) => getAltCount(stats, r.threshold) < r.count).map((r) => (
              <div key={r.threshold} style={{ fontSize: 12, color: "#6b7280" }}>
                → {i(t.home_altReq, { m: r.threshold.toLocaleString(locale) })}
              </div>
            ))}
          </>
        )}
        {isCurrent && def.targetAscents == null && (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0369a1" }}>{t.home_maxLevel}</div>
        )}
      </div>
    </div>
  );
}

// ─── Badge card ───────────────────────────────────────────────────────────────

function BadgeCard({ emoji, title, sub, howTo, rarity, cairns, earned, current, target, isLast }: {
  emoji: string; title: string; sub: string; howTo: string; rarity: string;
  cairns: number; earned: boolean; current: number; target: number; isLast: boolean;
}) {
  const progress = Math.min(1, current / target);
  return (
    <div style={{
      display: "flex", gap: 12, padding: "14px 0",
      borderBottom: isLast ? "none" : "1px solid #f3f4f6",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, position: "relative",
        background: earned ? "#fef3c7" : "#f3f4f6",
        filter: earned ? "none" : "grayscale(0.8) opacity(0.5)",
      }}>
        {emoji}
        {earned && (
          <div style={{
            position: "absolute", top: -3, right: -3,
            width: 14, height: 14, borderRadius: "50%",
            background: "#f59e0b", border: "2px solid white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 7, color: "white", fontWeight: 900,
          }}>✓</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: earned ? "#92400e" : "#111827" }}>{title}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", flexShrink: 0 }}>+{cairns} 🪨</span>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 2px" }}>{sub}</div>
        <div style={{ fontSize: 10, color: "#9ca3af" }}>{howTo}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#c4b5a5" }}>{rarity}</span>
          {!earned && target > 1 && (
            <span style={{ fontSize: 10, color: "#d1d5db" }}>{current} / {target}</span>
          )}
        </div>
        {!earned && target > 1 && (
          <div style={{ height: 3, borderRadius: 99, background: "#f3f4f6", marginTop: 3 }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, borderRadius: 99, background: "#0369a1" }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomeClient({ data, locale, t }: {
  data: HomeData;
  locale: string;
  t: Dict;
}) {
  const router = useRouter();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [progressionExpanded, setProgressionExpanded] = useState(false);
  const { user, stats, leaderboard, userRank, nextRankName, nextRankGap, recentAscents } = data;

  function navigate(href: string) {
    if (navigatingTo) return;
    setNavigatingTo(href);
    router.push(href.replace("#hero", ""));
  }
  const badges = computeBadges(stats);
  const levelState = getLevelState(stats);
  const firstName = user.name.split(" ")[0];

  // Collapsed progression: 1 done before + in-progress + 2 locked (4 total)


  // Altitude breakdown for summit card (only non-zero buckets)
  const fmt = (n: number) => n.toLocaleString(locale);
  const altBuckets = [
    { icon: "🌿", name: t.home_altZone1, range: `0–${fmt(1000)} m`,             count: stats.totalAscents - stats.peaks1000plus },
    { icon: "⛰️", name: t.home_altZone2, range: `${fmt(1000)}–${fmt(2000)} m`,  count: stats.peaks1000plus - stats.peaks2000plus },
    { icon: "🏔️", name: t.home_altZone3, range: `${fmt(2000)}–${fmt(3000)} m`,  count: stats.peaks2000plus - stats.peaks3000plus },
    { icon: "❄️", name: t.home_altZone4, range: `${fmt(3000)}–${fmt(4000)} m`,  count: stats.peaks3000plus - stats.peaks4000plus },
    { icon: "🔥", name: t.home_altZone5, range: `${fmt(4000)}–${fmt(5000)} m`,  count: stats.peaks4000plus - stats.peaks5000plus },
    { icon: "🌌", name: t.home_altZone6, range: `${fmt(5000)}+ m`,              count: stats.peaks5000plus },
  ].filter((b) => b.count > 0);
  const myCount = leaderboard.find((e) => e.isCurrentUser)?.ascentCount ?? stats.totalAscents;

  // Motivation
  const rank2 = userRank === 1 && leaderboard.length > 1 ? leaderboard[1] : null;
  const rank2Gap = rank2 ? myCount - rank2.ascentCount : 0;

  let motivationMsg: string | null = null;
  let motivationVariant: "gold" | "green" | "warning" = "green";
  if (leaderboard.length > 1 || stats.friendsCount > 0) {
    if (userRank === 1) {
      if (rank2 && rank2Gap <= 3) {
        motivationVariant = "warning";
        motivationMsg = i(t.home_motivationDefend, { name: rank2.name, n: rank2Gap });
      } else {
        motivationVariant = "gold";
        motivationMsg = t.home_motivationFirst;
      }
    } else if (nextRankName && nextRankGap > 0) {
      motivationVariant = "green";
      motivationMsg = i(t.home_motivationBeat, { n: nextRankGap, name: nextRankName });
    }
  }

  const SECONDARY_STATS = [
    { emoji: "📸", value: stats.totalPhotos,  label: t.home_statPhotos,  href: "/ascents" },
    { emoji: "📍", value: stats.totalRegions, label: t.home_statRegions, href: "/map" },
    { emoji: "👥", value: stats.friendsCount, label: t.home_statFriends, href: "/friends" },
  ];

  const motColors = {
    gold:    { bg: "linear-gradient(90deg,#fef9c3,#fef08a)", icon: "🏆", color: "#713f12" },
    green:   { bg: "linear-gradient(90deg,#dcfce7,#d1fae5)", icon: "🎯", color: "#14532d" },
    warning: { bg: "linear-gradient(90deg,#fff7ed,#ffedd5)", icon: "⚠️", color: "#9a3412" },
  };
  const mot = motColors[motivationVariant];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 0 64px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        height: 283,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "space-between",
        padding: "24px 28px 26px",
        backgroundImage: "url('https://www.rutaspirineos.org/images/prat-de-cadi-desde-estana/prat-de-cadi-desde-estana-1.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center 60%",
        backgroundColor: "#1c2d3f",
        overflow: "hidden",
      }}>
        {/* Overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: "linear-gradient(to bottom, rgba(10,20,35,0.52) 0%, rgba(10,20,35,0.42) 25%, rgba(10,20,35,0.58) 52%, rgba(10,20,35,0.85) 75%, rgba(10,20,35,0.97) 100%)",
        }} />

        {/* Bloque superior: avatar + identidad */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Link href="/profile" style={{ textDecoration: "none", marginBottom: 10 }}>
            <div style={{
              width: 78, height: 78, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.50)",
              boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
              overflow: "hidden",
              background: "linear-gradient(145deg,#3a7bd5,#1a4a8a)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, fontWeight: 700, color: "white",
            }}>
              {user.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials(user.name)}
            </div>
          </Link>
          <h1 style={{ margin: "0 0 3px", fontSize: 21, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.03em", lineHeight: 1, textAlign: "center", textShadow: "0 1px 2px rgba(0,0,0,0.40)" }}>
            {user.name}
          </h1>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.72)", textAlign: "center" }}>
            {user.username ? `@${user.username}` : ""}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, letterSpacing: "-0.01em" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, position: "relative", top: "0.5px" }}>
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 5 L14.5 12 L9.5 12 Z" fill="rgba(255,255,255,0.88)"/>
              <path d="M12 19 L14.5 12 L9.5 12 Z"/>
            </svg>
            <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Azimut</span>
            <span style={{ color: "rgba(255,255,255,0.42)", fontWeight: 400 }}>·</span>
            <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.75)" }}>{t.home_heroSubtitle}</span>
          </div>
        </div>

        {/* Bloque inferior: métricas + progreso */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 14, width: "100%", paddingTop: 16, paddingBottom: 17 }}>

          {/* Métricas: cimas · ascensiones · alt. máx */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.04em", lineHeight: 1 }}>{stats.uniquePeaks}</span>
              <span style={{ fontSize: 10.5, fontWeight: 400, color: "rgba(255,255,255,0.70)" }}>{t.home_metricPeaks}</span>
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)", alignSelf: "center", margin: "0 4px" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.04em", lineHeight: 1 }}>{stats.totalAscents}</span>
              <span style={{ fontSize: 10.5, fontWeight: 400, color: "rgba(255,255,255,0.70)" }}>{t.home_metricAscents}</span>
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)", alignSelf: "center", margin: "0 4px" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.04em", lineHeight: 1 }}>
                {stats.maxAltitude > 0 ? `${stats.maxAltitude.toLocaleString(locale)}` : "—"}
                {stats.maxAltitude > 0 && <sup style={{ fontSize: 10, fontWeight: 400, verticalAlign: "super", marginLeft: 1, opacity: 0.55 }}>m</sup>}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 400, color: "rgba(255,255,255,0.70)" }}>{t.home_metricMaxAlt}</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Onboarding banner (new users only) ──────────────────────────── */}
      {stats.totalAscents === 0 && (
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "1.5px solid #86efac",
            borderRadius: 20, padding: "24px 20px",
            textAlign: "center",
          }}>
            <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#14532d", letterSpacing: "-0.02em" }}>
              {t.home_onboarding_title}
            </p>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#166534", lineHeight: 1.5 }}>
              {t.home_onboarding_sub}
            </p>
            <Link href="/ascents/new" style={{
              display: "inline-block",
              background: "#16a34a", color: "white",
              padding: "11px 24px", borderRadius: 12,
              fontSize: 14, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 4px 12px rgba(22,163,74,0.35)",
            }}>
              {t.home_onboarding_cta} →
            </Link>
          </div>
        </div>
      )}

      {/* ── Progression ─────────────────────────────────────────────────── */}
      <section style={{ padding: "20px 16px 0" }}>
        {LEVEL_DEFS.map((def, idx) => {
          const isDone       = idx < levelState.currentIdx;
          const isInProgress = idx === levelState.currentIdx;
          if (!progressionExpanded && !isInProgress) return null;
          const status = isDone ? "completed" : isInProgress ? "current" : "locked";
          return (
            <LevelCard
              key={def.idx}
              def={def}
              status={status}
              stats={stats}
              t={t}
              locale={locale}
            />
          );
        })}

        {/* Expand / collapse CTA */}
        {!progressionExpanded ? (
          <button
            onClick={() => setProgressionExpanded(true)}
            style={{
              width: "100%", marginTop: 2,
              background: "none", border: "1.5px solid #e5e7eb", borderRadius: 10,
              padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#374151",
              cursor: "pointer",
            }}
          >
            {t.home_seeAllLevels}
          </button>
        ) : (
          <button
            onClick={() => setProgressionExpanded(false)}
            style={{
              width: "100%", marginTop: 2,
              background: "none", border: "none",
              padding: "6px", fontSize: 13, fontWeight: 600, color: "#9ca3af",
              cursor: "pointer",
            }}
          >
            {t.home_hideLevels}
          </button>
        )}
      </section>

      {/* ── Leaderboard ─────────────────────────────────────────────────── */}
      {leaderboard.length > 1 && (
        <section style={{ padding: "20px 16px 0" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>
                {t.home_ranking}
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{t.home_ropeTeamSub}</p>
            </div>
            <span style={{
              display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
              background: userRank === 1 ? "#fef9c3" : "#f3f4f6",
              color: userRank === 1 ? "#854d0e" : "#6b7280",
              fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 20,
            }}>
              <span style={{ fontSize: 14 }}>⛰️</span> #{userRank} {t.home_yourPosition}
            </span>
          </div>

          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            {leaderboard.slice(0, 5).map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.isCurrentUser;
              const myEp2 = leaderboard.find((e) => e.isCurrentUser)?.ep ?? 0;
              const epDiff = entry.ep - myEp2;
              const lvlColor = LEVEL_COLORS[(entry.levelIdx - 1) % LEVEL_COLORS.length];
              const levelName = t[LEVEL_DEFS[(entry.levelIdx - 1) % LEVEL_DEFS.length].nameKey];
              const progressPct = entry.nextLevelTarget
                ? Math.min(100, Math.round((entry.ep / entry.nextLevelTarget) * 100))
                : 100;

              // Hint for current user
              let hint: string | null = null;
              if (isMe) {
                if (userRank === 1 && nextRankGap > 0 && nextRankName) {
                  hint = i(t.home_epToSecure, { n: nextRankGap });
                } else if (userRank > 1 && nextRankGap > 0 && nextRankName) {
                  hint = i(t.home_epToBeat, { n: nextRankGap, name: nextRankName });
                }
              }

              if (isMe) {
                // ── Current user card ──────────────────────────────────────
                return (
                  <div key={entry.userId} style={{
                    padding: "16px 16px 14px",
                    background: "linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)",
                    borderBottom: idx < Math.min(leaderboard.length, 5) - 1 ? "1px solid #dbeafe" : "none",
                    borderLeft: "3px solid #0369a1",
                  }}>
                    {/* Row: rank + avatar + name/level + metrics */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 22, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#0369a1", flexShrink: 0 }}>
                        {rank}
                      </div>
                      <Avatar name={entry.name} url={entry.avatarUrl} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {entry.name} <span style={{ fontWeight: 400, color: "#64748b", fontSize: 12 }}>({t.home_youAre})</span>
                        </p>
                        <span style={{
                          display: "inline-block", marginTop: 2,
                          fontSize: 10, fontWeight: 700, color: lvlColor.dark,
                          background: lvlColor.mid, borderRadius: 6, padding: "1px 6px",
                        }}>{levelName}</span>
                      </div>
                      {/* EP + Cairns */}
                      <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#0369a1", lineHeight: 1 }}>{entry.ep}</div>
                          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>EP</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#d97706", lineHeight: 1 }}>{entry.cairns}</div>
                          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>Cairns</div>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {entry.nextLevelTarget && (
                      <div style={{ marginTop: 10, paddingLeft: 70 }}>
                        <div style={{ height: 5, background: "#dbeafe", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${progressPct}%`, background: "#0369a1", borderRadius: 99, transition: "width 0.4s" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>
                            {entry.ep} / {entry.nextLevelTarget} EP
                          </span>
                          {hint && (
                            <span style={{ fontSize: 10, color: "#0369a1", fontWeight: 700 }}>{hint}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // ── Other users row ────────────────────────────────────────
              return (
                <div key={entry.userId} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 16px",
                  background: "white",
                  borderBottom: idx < Math.min(leaderboard.length, 5) - 1 ? "1px solid #f3f4f6" : "none",
                }}>
                  <div style={{ width: 22, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#d1d5db", flexShrink: 0 }}>
                    {rank}
                  </div>
                  <Avatar name={entry.name} url={entry.avatarUrl} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {entry.name}
                    </p>
                    <span style={{
                      display: "inline-block", marginTop: 1,
                      fontSize: 10, fontWeight: 700, color: lvlColor.dark,
                      background: lvlColor.mid, borderRadius: 6, padding: "1px 6px",
                    }}>{levelName}</span>
                  </div>
                  {/* EP + Cairns */}
                  <div style={{ display: "flex", gap: 12, flexShrink: 0, alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#374151", lineHeight: 1 }}>{entry.ep} <span style={{ fontSize: 10, fontWeight: 400, color: "#9ca3af" }}>EP</span></div>
                      <div style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>{entry.cairns} <span style={{ fontSize: 10, fontWeight: 400, color: "#9ca3af" }}>Cairns</span></div>
                    </div>
                    {epDiff !== 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 10, flexShrink: 0,
                        background: epDiff > 0 ? "#fef2f2" : "#f0fdf4",
                        color: epDiff > 0 ? "#dc2626" : "#16a34a",
                      }}>
                        {epDiff > 0 ? `+${epDiff}` : i(t.home_epBehind, { n: Math.abs(epDiff) })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── No friends CTA ──────────────────────────────────────────────── */}
      {stats.friendsCount === 0 && (
        <section style={{ padding: "20px 16px 0" }}>
          <div style={{
            background: "linear-gradient(135deg,#eff6ff,#f0f9ff)",
            border: "1.5px dashed #bfdbfe", borderRadius: 16, padding: "22px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
            <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#111827" }}>
              {t.home_motivationNoFriends}
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6b7280" }}>
              {t.home_motivationNoFriendsSub}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/friends" style={{
                display: "inline-block", background: "#0369a1", color: "white",
                padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>
                {t.home_addFriends}
              </Link>
              <Link href="/friends" style={{
                display: "inline-block", background: "white", color: "#0369a1",
                border: "1.5px solid #bfdbfe",
                padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>
                {t.home_inviteFriends}
              </Link>
            </div>
          </div>
        </section>
      )}


      {/* ── Recent Ascents ──────────────────────────────────────────────── */}
      <section style={{ padding: "24px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
            {t.home_recentAscents}
          </h2>
          <Link href="/ascents" style={{ fontSize: 13, fontWeight: 600, color: "#0369a1", textDecoration: "none" }}>
            {t.home_seeAll} →
          </Link>
        </div>

        {recentAscents.length === 0 ? (
          <div style={{ padding: "0 16px" }}>
            <div style={{
              background: "#f9fafb", border: "1.5px dashed #d1d5db", borderRadius: 14,
              padding: "28px 20px", textAlign: "center",
            }}>
              <p style={{ margin: "0 0 8px", fontSize: 32 }}>🏔️</p>
              <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#374151" }}>
                {t.home_noAscents}
              </p>
              <Link href="/ascents/new" style={{
                display: "inline-block", background: "#0369a1", color: "white",
                padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>
                {t.home_logFirst}
              </Link>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex", gap: 12, overflowX: "auto",
            padding: "4px 16px 8px", scrollbarWidth: "none",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any}>
            {recentAscents.map((a) => (
              <Link key={a.id} href={`/ascents/${a.id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                <div style={{
                  width: 150, borderRadius: 14,
                  border: "1px solid #e5e7eb", overflow: "hidden",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.07)",
                }}>
                  <div style={{ height: 120, background: "#e5e7eb", position: "relative", overflow: "hidden" }}>
                    {a.photoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={a.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🏔️</div>
                    }
                    {/* Gradient overlay with text */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      background: "linear-gradient(transparent,rgba(0,0,0,0.65))",
                      padding: "20px 8px 7px",
                    }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {a.peakName}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
                        {a.altitudeM.toLocaleString(locale)} m
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>


      {/* ── Achievements ────────────────────────────────────────────────── */}
      <section style={{ padding: "24px 16px 0" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>
          {t.home_badges}
        </h2>
        <div style={{
          background: "white", border: "1px solid #e5e7eb", borderRadius: 16,
          padding: "0 16px",
        }}>
          {badges.map((b, i) => (
            <BadgeCard
              key={b.id}
              emoji={b.emoji}
              title={t[b.titleKey] as string}
              sub={t[b.subKey] as string}
              howTo={b.howTo}
              rarity={b.rarity}
              cairns={b.cairns}
              earned={b.earned}
              current={b.current}
              target={b.target}
              isLast={i === badges.length - 1}
            />
          ))}
        </div>
      </section>

    </div>
  );
}
