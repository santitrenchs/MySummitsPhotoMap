"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HomeData } from "@/lib/services/home.service";
import type { Dict } from "@/lib/i18n/types";
import { i } from "@/lib/i18n";

// ─── Level system ─────────────────────────────────────────────────────────────

const LEVEL_DEFS: { min: number; next: number | null; key: keyof Dict }[] = [
  { min: 0,   next: 1,   key: "level_novice" },
  { min: 1,   next: 10,  key: "level_explorer" },
  { min: 10,  next: 25,  key: "level_hiker" },
  { min: 25,  next: 50,  key: "level_mountaineer" },
  { min: 50,  next: 100, key: "level_peakBagger" },
  { min: 100, next: null, key: "level_summiteer" },
];

function getLevelInfo(n: number) {
  const lvl = [...LEVEL_DEFS].reverse().find((l) => n >= l.min) ?? LEVEL_DEFS[0];
  return { key: lvl.key, next: lvl.next, progress: lvl.next ? Math.min(1, n / lvl.next) : 1 };
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
  const { user, stats, leaderboard, userRank, nextRankName, nextRankGap, recentAscents, friendsActivity } = data;
  const badges = computeBadges(stats);
  const levelInfo = getLevelInfo(stats.totalAscents);
  const firstName = user.name.split(" ")[0];
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

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(150deg,#0c4a6e 0%,#0369a1 55%,#0ea5e9 100%)",
        padding: "28px 20px 22px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -10, right: 80, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        {/* User row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", marginBottom: 18 }}>
          <Link href="/profile" style={{ textDecoration: "none" }}>
            <Avatar name={user.name} url={user.avatarUrl} size={62} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>
              {t.home_greeting.replace("{name}", firstName)}
            </p>
            <h1 style={{ margin: "1px 0 6px", fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.username ? `@${user.username}` : user.name}
            </h1>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
              borderRadius: 20, padding: "3px 10px",
            }}>
              <span style={{ fontSize: 11 }}>⛰️</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "white", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {t[levelInfo.key] as string}
              </span>
            </div>
          </div>
        </div>

        {/* Level progress bar */}
        <div style={{ position: "relative" }}>
          <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 4,
              width: `${levelInfo.progress * 100}%`,
              background: levelInfo.next
                ? "linear-gradient(90deg,#7dd3fc,#e0f2fe)"
                : "linear-gradient(90deg,#fde68a,#fbbf24)",
            }} />
          </div>
          <p style={{ margin: "5px 0 0", fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
            {levelInfo.next
              ? i(t.home_levelNext, { current: stats.totalAscents, next: levelInfo.next })
              : t.home_maxLevel}
          </p>
        </div>
      </div>

      {/* ── Summit hero card ─────────────────────────────────────────────── */}
      <div style={{ padding: "16px 16px 0" }}>
        <div
          onClick={() => router.push("/ascents")}
          style={{
            background: "linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 60%,#2563eb 100%)",
            borderRadius: 20, padding: "20px 24px",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "relative", overflow: "hidden",
            boxShadow: "0 4px 20px rgba(29,78,216,0.35)",
          }}
        >
          <div style={{ position: "absolute", top: -30, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              {t.home_statSummits}
            </div>
            <div style={{ fontSize: 62, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-0.04em" }}>
              {stats.totalAscents.toLocaleString(locale)}
            </div>
          </div>
          <div style={{ fontSize: 56, opacity: 0.85, position: "relative" }}>🏔️</div>
        </div>
      </div>

      {/* ── Secondary stats (3-col) ──────────────────────────────────────── */}
      <div style={{ padding: "10px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {SECONDARY_STATS.map(({ emoji, value, label, href }) => (
            <div
              key={label}
              onClick={() => router.push(href)}
              style={{
                background: "white", border: "1px solid #e5e7eb", borderRadius: 14,
                padding: "13px 10px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}
            >
              <span style={{ fontSize: 20 }}>{emoji}</span>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                {value.toLocaleString(locale)}
              </div>
              <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 500, textAlign: "center" }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

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

      {/* ── Motivation banner ───────────────────────────────────────────── */}
      {motivationMsg && (
        <section style={{ padding: "16px 16px 0" }}>
          <div style={{
            background: mot.bg, borderRadius: 14, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{mot.icon}</span>
            <p style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: mot.color }}>
              {motivationMsg}
            </p>
            {motivationVariant !== "gold" && (
              <Link href="/ascents/new" style={{
                flexShrink: 0, background: mot.color, color: "white",
                padding: "7px 12px", borderRadius: 9,
                fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
              }}>
                + {t.nav_logAscent}
              </Link>
            )}
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

      {/* ── Friends Activity ────────────────────────────────────────────── */}
      <section style={{ padding: "24px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
            {t.home_friendsActivity}
          </h2>
          {friendsActivity.length > 0 && (
            <Link href="/social" style={{ fontSize: 13, fontWeight: 600, color: "#0369a1", textDecoration: "none" }}>
              {t.home_seeAll} →
            </Link>
          )}
        </div>

        {friendsActivity.length === 0 ? (
          <div style={{
            background: "#f9fafb", border: "1.5px dashed #e5e7eb", borderRadius: 14,
            padding: "22px", textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⛰️</div>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
              {t.home_noFriendActivity}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/friends" style={{
                display: "inline-block", background: "white", color: "#374151",
                border: "1px solid #d1d5db",
                padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, textDecoration: "none",
              }}>
                {t.home_inviteFriends}
              </Link>
              <Link href="/ascents/new" style={{
                display: "inline-block", background: "#0369a1", color: "white",
                padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, textDecoration: "none",
              }}>
                {t.home_logFirst}
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
            {friendsActivity.map((a, idx) => (
              <Link key={a.ascentId} href={`/ascents/${a.ascentId}`} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 11,
                  padding: "11px 14px",
                  borderBottom: idx < friendsActivity.length - 1 ? "1px solid #f3f4f6" : "none",
                }}>
                  <Avatar name={a.userName} url={a.userAvatarUrl} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#111827", lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 700 }}>{a.userName}</span>
                      {" "}{t.home_climbed}{" "}
                      <span style={{ fontWeight: 600, color: "#0369a1" }}>{a.peakName}</span>
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                      {new Date(a.date).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                      {" · "}{a.altitudeM.toLocaleString(locale)} m
                    </p>
                  </div>
                  {a.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.photoUrl} alt="" style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", border: "1px solid #e5e7eb", flexShrink: 0 }} />
                  )}
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
