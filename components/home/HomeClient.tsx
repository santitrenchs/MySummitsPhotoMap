"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HomeData } from "@/lib/services/home.service";
import type { Dict } from "@/lib/i18n/types";
import { i } from "@/lib/i18n";

// ─── Level system ─────────────────────────────────────────────────────────────

type AltReq = { threshold: number; count: number };
type LevelDef = { idx: number; emoji: string; name: string; minAscents: number; altReqs?: AltReq[] };

const LEVEL_DEFS: LevelDef[] = [
  { idx: 1, emoji: "🌱", name: "Iniciado",   minAscents: 1 },
  { idx: 2, emoji: "🥾", name: "Explorador", minAscents: 5 },
  { idx: 3, emoji: "🧭", name: "Montañero",  minAscents: 15, altReqs: [{ threshold: 2000, count: 1 }] },
  { idx: 4, emoji: "🏔️", name: "Alpinista",  minAscents: 30, altReqs: [{ threshold: 3000, count: 1 }] },
  { idx: 5, emoji: "👑", name: "Leyenda",    minAscents: 60, altReqs: [{ threshold: 3000, count: 2 }, { threshold: 4000, count: 1 }] },
];

function getAltCount(stats: HomeData["stats"], threshold: number): number {
  if (threshold >= 5000) return stats.peaks5000plus;
  if (threshold >= 4000) return stats.peaks4000plus;
  if (threshold >= 3000) return stats.peaks3000plus;
  if (threshold >= 2000) return stats.peaks2000plus;
  return stats.peaks1000plus;
}

function meetsLevel(def: LevelDef, n: number, stats: HomeData["stats"]): boolean {
  if (n < def.minAscents) return false;
  return !def.altReqs || def.altReqs.every((r) => getAltCount(stats, r.threshold) >= r.count);
}

function getLevelState(stats: HomeData["stats"]) {
  let currentIdx = -1;
  for (let i = 0; i < LEVEL_DEFS.length; i++) {
    if (meetsLevel(LEVEL_DEFS[i], stats.totalAscents, stats)) currentIdx = i;
  }
  const current = currentIdx >= 0 ? LEVEL_DEFS[currentIdx] : null;
  const next = currentIdx < LEVEL_DEFS.length - 1 ? LEVEL_DEFS[currentIdx + 1] : null;
  return { currentIdx, current, next };
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
  id: string; emoji: string; labelKey: keyof Dict;
  earned: boolean; progress: number; current: number; target: number;
};

function computeBadges(stats: HomeData["stats"]): Badge[] {
  return [
    { id: "first",   emoji: "🏔️", labelKey: "home_badgeFirst",  earned: stats.totalAscents >= 1,   progress: Math.min(1, stats.totalAscents / 1),  current: stats.totalAscents, target: 1 },
    { id: "ten",     emoji: "🥉", labelKey: "home_badge10",      earned: stats.totalAscents >= 10,  progress: Math.min(1, stats.totalAscents / 10), current: stats.totalAscents, target: 10 },
    { id: "twenty5", emoji: "🥈", labelKey: "home_badge25",      earned: stats.totalAscents >= 25,  progress: Math.min(1, stats.totalAscents / 25), current: stats.totalAscents, target: 25 },
    { id: "fifty",   emoji: "🥇", labelKey: "home_badge50",      earned: stats.totalAscents >= 50,  progress: Math.min(1, stats.totalAscents / 50), current: stats.totalAscents, target: 50 },
    { id: "regions", emoji: "🗺️", labelKey: "home_badgeRegions", earned: stats.totalRegions >= 3,   progress: Math.min(1, stats.totalRegions / 3),  current: stats.totalRegions, target: 3 },
    { id: "photos",  emoji: "📸", labelKey: "home_badgePhotos",  earned: stats.totalPhotos >= 20,   progress: Math.min(1, stats.totalPhotos / 20),  current: stats.totalPhotos, target: 20 },
    { id: "social",  emoji: "👥", labelKey: "home_badgeFriends", earned: stats.friendsCount >= 3,   progress: Math.min(1, stats.friendsCount / 3),  current: stats.friendsCount, target: 3 },
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

// ─── Badge with progress ring ─────────────────────────────────────────────────

function BadgeCircle({ emoji, label, earned, progress, current, target }: {
  emoji: string; label: string; earned: boolean; progress: number; current: number; target: number;
}) {
  const sz = 60;
  const r = 25;
  const circ = 2 * Math.PI * r;
  const trackColor = earned ? "#fde68a" : progress > 0 ? "#bfdbfe" : "#f3f4f6";
  const fillColor  = earned ? "#f59e0b" : progress > 0 ? "#0369a1" : "#d1d5db";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, width: 76 }}>
      <div style={{ position: "relative", width: sz, height: sz }}>
        <svg width={sz} height={sz} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke={trackColor} strokeWidth={4} />
          <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke={fillColor} strokeWidth={4}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)} strokeLinecap="round" />
        </svg>
        <div style={{
          position: "absolute", inset: 5,
          background: earned ? "#fef3c7" : "#f9fafb",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
          filter: earned ? "none" : progress > 0 ? "grayscale(0.2) opacity(0.85)" : "grayscale(1) opacity(0.4)",
        }}>
          {emoji}
        </div>
        {earned && (
          <div style={{
            position: "absolute", top: 0, right: 0,
            width: 16, height: 16, borderRadius: "50%",
            background: "#f59e0b", border: "2px solid white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 8, color: "white", fontWeight: 900,
          }}>✓</div>
        )}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 700, textAlign: "center", lineHeight: 1.2,
        color: earned ? "#92400e" : "#6b7280",
      }}>{label}</span>
      {!earned && (
        <span style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600 }}>{current}/{target}</span>
      )}
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
            <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.75)" }}>Tu evolución en la montaña</span>
          </div>
        </div>

        {/* Bloque inferior: métricas + progreso */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 14, width: "100%", paddingTop: 16, paddingBottom: 17 }}>

          {/* Métricas: cimas · ascensiones · alt. máx */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.04em", lineHeight: 1 }}>{stats.uniquePeaks}</span>
              <span style={{ fontSize: 10.5, fontWeight: 400, color: "rgba(255,255,255,0.70)" }}>cimas</span>
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)", alignSelf: "center", margin: "0 4px" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.04em", lineHeight: 1 }}>{stats.totalAscents}</span>
              <span style={{ fontSize: 10.5, fontWeight: 400, color: "rgba(255,255,255,0.70)" }}>ascensiones</span>
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)", alignSelf: "center", margin: "0 4px" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.04em", lineHeight: 1 }}>
                {stats.maxAltitude > 0 ? `${stats.maxAltitude.toLocaleString(locale)}` : "—"}
                {stats.maxAltitude > 0 && <sup style={{ fontSize: 10, fontWeight: 400, verticalAlign: "super", marginLeft: 1, opacity: 0.55 }}>m</sup>}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 400, color: "rgba(255,255,255,0.70)" }}>alt. máx</span>
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

      {/* ── Progression timeline ────────────────────────────────────────── */}
      <section style={{ padding: "20px 16px 0" }}>
        <div>
          {LEVEL_DEFS.map((def, idx) => {
            const isDone = idx <= levelState.currentIdx;
            const isInProgress = levelState.next !== null && idx === levelState.currentIdx + 1;
            const isLocked = !isDone && !isInProgress;

            // Collapsed: show only current level. Expanded: show all.
            if (!progressionExpanded && !isInProgress) return null;

            const isLastVisible = progressionExpanded
              ? idx === LEVEL_DEFS.length - 1
              : true;

            return (
              <div key={def.idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: isLastVisible ? 0 : 16 }}>
                {/* Left: circle + connector */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 30, flexShrink: 0 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    background: isDone ? "#16a34a" : isInProgress ? "#0369a1" : "#e5e7eb",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: isDone ? 13 : 11,
                    color: isDone || isInProgress ? "white" : "#9ca3af",
                    fontWeight: 800,
                    boxShadow: isInProgress ? "0 0 0 3px #bfdbfe" : "none",
                  }}>
                    {isDone ? "✓" : def.idx}
                  </div>
                  {!isLastVisible && (
                    <div style={{
                      width: 2, flex: 1, minHeight: 20,
                      background: idx < levelState.currentIdx ? "#86efac" : "#e5e7eb",
                      margin: "3px 0",
                    }} />
                  )}
                </div>

                {/* Right: level card */}
                <div style={{
                  flex: 1,
                  background: isInProgress ? "linear-gradient(135deg,#eff6ff,#f0f9ff)" : "white",
                  border: isInProgress ? "1.5px solid #bfdbfe" : "1px solid #e5e7eb",
                  borderRadius: 12, padding: "10px 12px",
                  marginBottom: 0,
                  opacity: isLocked ? 0.7 : 1,
                }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{def.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1, color: isInProgress ? "#0369a1" : isLocked ? "#9ca3af" : "#111827" }}>
                      {def.name}
                    </span>
                    {isDone && (
                      <span style={{ fontSize: 9, fontWeight: 800, background: "#dcfce7", color: "#166534", padding: "2px 7px", borderRadius: 8 }}>
                        ✓
                      </span>
                    )}
                    {isLocked && (
                      <span style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1 }}>🔒</span>
                    )}
                  </div>

                  {/* Requirement pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6,
                      background: isDone ? "#f0fdf4" : "#f3f4f6",
                      color: isDone ? "#16a34a" : isLocked ? "#9ca3af" : "#374151",
                    }}>
                      {def.minAscents} {t.home_statSummits.toLowerCase()}
                    </span>
                    {def.altReqs?.map((r) => {
                      const met = getAltCount(stats, r.threshold) >= r.count;
                      const label = r.count === 1
                        ? i(t.home_altReq, { m: r.threshold.toLocaleString(locale) })
                        : i(t.home_altReqMulti, { n: r.count, m: r.threshold.toLocaleString(locale) });
                      return (
                        <span key={r.threshold} style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6,
                          background: met ? "#f0fdf4" : "#f3f4f6",
                          color: met ? "#16a34a" : isLocked ? "#9ca3af" : "#374151",
                        }}>
                          {label}
                        </span>
                      );
                    })}
                  </div>

                  {/* In-progress: show detailed progress */}
                  {isInProgress && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #dbeafe" }}>
                      <div style={{ height: 4, borderRadius: 2, background: "#dbeafe", overflow: "hidden", marginBottom: 5 }}>
                        <div style={{
                          height: "100%", borderRadius: 2,
                          width: `${Math.min(stats.totalAscents / def.minAscents * 100, 100)}%`,
                          background: "#0369a1",
                        }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0369a1", marginBottom: 2 }}>
                        {i(t.home_levelProgress, { current: stats.totalAscents, total: def.minAscents })}
                      </div>
                      {stats.totalAscents < def.minAscents && (
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                          → {i(t.home_levelNeedSummits, { n: def.minAscents - stats.totalAscents })}
                        </div>
                      )}
                      {def.altReqs?.filter((r) => getAltCount(stats, r.threshold) < r.count).map((r) => (
                        <div key={r.threshold} style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                          → {i(t.home_altReq, { m: r.threshold.toLocaleString(locale) })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Expand / collapse CTA */}
        {!progressionExpanded ? (
          <button
            onClick={() => setProgressionExpanded(true)}
            style={{
              width: "100%", marginTop: 12,
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
              width: "100%", marginTop: 10,
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
              {t.home_ranking}
            </h2>
            <span style={{
              background: userRank === 1 ? "#fef9c3" : userRank <= 3 ? "#eff6ff" : "#f3f4f6",
              color: userRank === 1 ? "#854d0e" : userRank <= 3 ? "#0369a1" : "#6b7280",
              fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            }}>
              {rankMedal(userRank)} #{userRank}
            </span>
          </div>

          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
            {leaderboard.slice(0, 5).map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.isCurrentUser;
              const diff = entry.ascentCount - myCount;

              return (
                <div key={entry.userId} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px",
                  background: isMe ? "linear-gradient(90deg,#eff6ff,#f0f9ff)" : "white",
                  borderBottom: idx < Math.min(leaderboard.length, 5) - 1 ? "1px solid #f3f4f6" : "none",
                  borderLeft: isMe ? "3px solid #0369a1" : "3px solid transparent",
                }}>
                  <div style={{ width: 26, textAlign: "center", fontSize: rank <= 3 ? 18 : 13, fontWeight: rank > 3 ? 700 : undefined, color: rank > 3 ? "#9ca3af" : undefined, flexShrink: 0 }}>
                    {rankMedal(rank)}
                  </div>

                  <Avatar name={entry.name} url={entry.avatarUrl} size={34} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: isMe ? 700 : 600, color: isMe ? "#0369a1" : "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {isMe ? `${entry.name} (${t.home_youAre})` : entry.name}
                    </p>
                  </div>

                  {/* Diff badge */}
                  {!isMe && diff !== 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      padding: "2px 7px", borderRadius: 10,
                      background: diff > 0 ? "#fef2f2" : "#f0fdf4",
                      color: diff > 0 ? "#dc2626" : "#16a34a",
                      flexShrink: 0,
                    }}>
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  )}

                  <span style={{ fontSize: 14, fontWeight: 800, color: isMe ? "#0369a1" : "#374151", flexShrink: 0, minWidth: 32, textAlign: "right" }}>
                    {entry.ascentCount}
                  </span>
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
          padding: "16px 10px",
          display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any}>
          {badges.map((b) => (
            <BadgeCircle
              key={b.id}
              emoji={b.emoji}
              label={t[b.labelKey] as string}
              earned={b.earned}
              progress={b.progress}
              current={b.current}
              target={b.target}
            />
          ))}
        </div>
      </section>

    </div>
  );
}
