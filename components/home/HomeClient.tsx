"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HomeData } from "@/lib/services/home.service";
import type { Dict } from "@/lib/i18n/types";
import { i } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function levelTitle(n: number): string {
  if (n === 0) return "Novice";
  if (n < 10) return "Explorer";
  if (n < 25) return "Hiker";
  if (n < 50) return "Mountaineer";
  if (n < 100) return "Peak Bagger";
  return "Summiteer";
}

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

type Badge = { id: string; emoji: string; labelKey: keyof Dict; earned: boolean; progress: number };

function computeBadges(stats: HomeData["stats"]): Badge[] {
  return [
    { id: "first",   emoji: "🏔️", labelKey: "home_badgeFirst",   earned: stats.totalAscents >= 1,   progress: Math.min(1, stats.totalAscents / 1) },
    { id: "ten",     emoji: "🥉", labelKey: "home_badge10",       earned: stats.totalAscents >= 10,  progress: Math.min(1, stats.totalAscents / 10) },
    { id: "twenty5", emoji: "🥈", labelKey: "home_badge25",       earned: stats.totalAscents >= 25,  progress: Math.min(1, stats.totalAscents / 25) },
    { id: "fifty",   emoji: "🥇", labelKey: "home_badge50",       earned: stats.totalAscents >= 50,  progress: Math.min(1, stats.totalAscents / 50) },
    { id: "regions", emoji: "🗺️", labelKey: "home_badgeRegions",  earned: stats.totalRegions >= 3,   progress: Math.min(1, stats.totalRegions / 3) },
    { id: "photos",  emoji: "📸", labelKey: "home_badgePhotos",   earned: stats.totalPhotos >= 20,   progress: Math.min(1, stats.totalPhotos / 20) },
    { id: "social",  emoji: "👥", labelKey: "home_badgeFriends",  earned: stats.friendsCount >= 3,   progress: Math.min(1, stats.friendsCount / 3) },
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
      boxShadow: "0 0 0 2px rgba(255,255,255,0.4)",
    }}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initials(name)}
    </div>
  );
}

// ─── Badge circle with progress ring ─────────────────────────────────────────

function BadgeCircle({ emoji, label, earned, progress }: {
  emoji: string; label: string; earned: boolean; progress: number;
}) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, width: 68 }}>
      <div style={{ position: "relative", width: 52, height: 52 }}>
        <svg width={52} height={52} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={26} cy={26} r={r} fill="none" stroke={earned ? "#bfdbfe" : "#f3f4f6"} strokeWidth={3} />
          <circle
            cx={26} cy={26} r={r} fill="none"
            stroke={earned ? "#0369a1" : "#d1d5db"} strokeWidth={3}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress)}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, filter: earned ? "none" : "grayscale(1) opacity(0.45)",
        }}>
          {emoji}
        </div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, textAlign: "center",
        color: earned ? "#0369a1" : "#9ca3af",
        lineHeight: 1.3,
      }}>{label}</span>
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
  const level = levelTitle(stats.totalAscents);

  // Motivation message
  let motivationMsg: string | null = null;
  if (leaderboard.length <= 1 && stats.friendsCount === 0) {
    motivationMsg = null; // no friends yet, show add-friends CTA instead
  } else if (userRank === 1) {
    motivationMsg = t.home_motivationFirst;
  } else if (nextRankName && nextRankGap > 0) {
    motivationMsg = i(t.home_motivationBeat, { n: nextRankGap, name: nextRankName });
  }

  const STATS = [
    { emoji: "🏔️", value: stats.totalAscents, label: t.home_statSummits, href: "/ascents" },
    { emoji: "📸", value: stats.totalPhotos,  label: t.home_statPhotos,   href: "/ascents" },
    { emoji: "📍", value: stats.totalRegions, label: t.home_statRegions,  href: "/map" },
    { emoji: "👥", value: stats.friendsCount, label: t.home_statFriends,  href: "/friends" },
  ];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 0 48px" }}>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0ea5e9 100%)",
        padding: "28px 20px 32px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -20, right: 60, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
          <Link href="/profile" style={{ textDecoration: "none" }}>
            <Avatar name={user.name} url={user.avatarUrl} size={58} />
          </Link>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>
              {t.home_greeting.replace("{name}", user.name.split(" ")[0])}
            </p>
            <h1 style={{ margin: "2px 0 6px", fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
              {user.username ? `@${user.username}` : user.name}
            </h1>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
              borderRadius: 20, padding: "3px 10px",
            }}>
              <span style={{ fontSize: 12 }}>🏔️</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "white", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {level}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Stats ───────────────────────────────────────────────────── */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {STATS.map(({ emoji, value, label, href }) => (
            <div
              key={label}
              onClick={() => router.push(href)}
              style={{
                background: "white", border: "1px solid #e5e7eb",
                borderRadius: 16, padding: "16px 18px",
                cursor: "pointer",
                transition: "box-shadow 0.15s",
                display: "flex", alignItems: "center", gap: 12,
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</span>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                  {value.toLocaleString(locale)}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, marginTop: 2 }}>
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Leaderboard ─────────────────────────────────────────────────── */}
      {leaderboard.length > 1 && (
        <section style={{ padding: "24px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
              {t.home_ranking}
            </h2>
            <span style={{
              background: userRank === 1 ? "#fef9c3" : userRank <= 3 ? "#eff6ff" : "#f3f4f6",
              color: userRank === 1 ? "#854d0e" : userRank <= 3 ? "#0369a1" : "#6b7280",
              fontSize: 12, fontWeight: 700,
              padding: "3px 10px", borderRadius: 20,
            }}>
              {rankMedal(userRank)} #{userRank}
            </span>
          </div>

          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
            {leaderboard.slice(0, 5).map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.isCurrentUser;
              return (
                <div key={entry.userId} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px",
                  background: isMe ? "linear-gradient(90deg, #eff6ff 0%, #f0f9ff 100%)" : "white",
                  borderBottom: idx < Math.min(leaderboard.length, 5) - 1 ? "1px solid #f3f4f6" : "none",
                }}>
                  {/* Medal / rank */}
                  <div style={{
                    width: 28, textAlign: "center", fontSize: rank <= 3 ? 20 : 13,
                    fontWeight: rank > 3 ? 700 : undefined,
                    color: rank > 3 ? "#9ca3af" : undefined, flexShrink: 0,
                  }}>
                    {rankMedal(rank)}
                  </div>

                  <Avatar name={entry.name} url={entry.avatarUrl} size={36} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 14, fontWeight: isMe ? 700 : 600,
                      color: isMe ? "#0369a1" : "#111827",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {isMe ? `${entry.name} (${t.home_youAre})` : entry.name}
                    </p>
                  </div>

                  <span style={{
                    fontSize: 15, fontWeight: 800,
                    color: isMe ? "#0369a1" : "#374151", flexShrink: 0,
                  }}>
                    {entry.ascentCount}
                    <span style={{ fontSize: 10, fontWeight: 500, color: "#9ca3af", marginLeft: 2 }}>
                      {t.home_statSummits}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── No friends CTA ──────────────────────────────────────────────── */}
      {stats.friendsCount === 0 && (
        <section style={{ padding: "24px 16px 0" }}>
          <div style={{
            background: "linear-gradient(135deg, #eff6ff, #f0f9ff)",
            border: "1.5px dashed #bfdbfe", borderRadius: 16, padding: "20px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#111827" }}>
              {t.home_motivationNoFriends}
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6b7280" }}>
              {t.home_motivationNoFriendsSub}
            </p>
            <Link href="/friends" style={{
              display: "inline-block", background: "#0369a1", color: "white",
              padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              textDecoration: "none",
            }}>
              {t.home_addFriends}
            </Link>
          </div>
        </section>
      )}

      {/* ── Motivation banner ───────────────────────────────────────────── */}
      {motivationMsg && (
        <section style={{ padding: "16px 16px 0" }}>
          <div style={{
            background: userRank === 1
              ? "linear-gradient(90deg, #fef9c3, #fef08a)"
              : "linear-gradient(90deg, #dcfce7, #d1fae5)",
            borderRadius: 14, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{userRank === 1 ? "🏆" : "🎯"}</span>
            <p style={{
              margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.4,
              color: userRank === 1 ? "#713f12" : "#14532d",
            }}>
              {motivationMsg}
            </p>
          </div>
        </section>
      )}

      {/* ── Recent Ascents ──────────────────────────────────────────────── */}
      <section style={{ padding: "24px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", marginBottom: 12 }}>
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
              background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 14,
              padding: "28px 20px", textAlign: "center",
            }}>
              <p style={{ margin: "0 0 12px", fontSize: 32 }}>🏔️</p>
              <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#374151" }}>
                {t.home_noAscents}
              </p>
              <Link href="/ascents/new" style={{
                display: "inline-block", background: "#0369a1", color: "white",
                padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                textDecoration: "none",
              }}>
                {t.home_logFirst}
              </Link>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex", gap: 12, overflowX: "auto",
            padding: "4px 16px 8px",
            scrollbarWidth: "none",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any}>
            {recentAscents.map((a) => (
              <Link key={a.id} href={`/ascents/${a.id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                <div style={{
                  width: 140, background: "white", borderRadius: 14,
                  border: "1px solid #e5e7eb", overflow: "hidden",
                }}>
                  {/* Thumbnail */}
                  <div style={{ height: 100, background: "#e5e7eb", position: "relative", overflow: "hidden" }}>
                    {a.photoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={a.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🏔️</div>
                    }
                    {/* Altitude badge */}
                    <div style={{
                      position: "absolute", bottom: 6, right: 6,
                      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
                      borderRadius: 8, padding: "2px 6px",
                      fontSize: 10, fontWeight: 700, color: "white",
                    }}>
                      {a.altitudeM.toLocaleString(locale)} m
                    </div>
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <p style={{
                      margin: 0, fontSize: 12, fontWeight: 700, color: "#111827",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {a.peakName}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af" }}>
                      {new Date(a.date).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Friends Activity ────────────────────────────────────────────── */}
      <section style={{ padding: "24px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
            {t.home_friendsActivity}
          </h2>
          <Link href="/social" style={{ fontSize: 13, fontWeight: 600, color: "#0369a1", textDecoration: "none" }}>
            {t.home_seeAll} →
          </Link>
        </div>

        {friendsActivity.length === 0 ? (
          <div style={{
            background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 14,
            padding: "20px", textAlign: "center",
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>{t.home_noFriendActivity}</p>
          </div>
        ) : (
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
            {friendsActivity.map((a, idx) => (
              <Link key={a.ascentId} href={`/ascents/${a.ascentId}`} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
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
                      {new Date(a.date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}{a.altitudeM.toLocaleString(locale)} m
                    </p>
                  </div>
                  {a.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.photoUrl} alt="" style={{
                      width: 40, height: 40, borderRadius: 8, objectFit: "cover",
                      border: "1px solid #e5e7eb", flexShrink: 0,
                    }} />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Badges ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "24px 16px 0" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>
          {t.home_badges}
        </h2>
        <div style={{
          background: "white", border: "1px solid #e5e7eb", borderRadius: 16,
          padding: "16px",
          display: "flex", gap: 8, overflowX: "auto",
          scrollbarWidth: "none",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any}>
          {badges.map((b) => (
            <BadgeCircle
              key={b.id}
              emoji={b.emoji}
              label={t[b.labelKey] as string}
              earned={b.earned}
              progress={b.progress}
            />
          ))}
        </div>
      </section>

    </div>
  );
}
