"use client";

import Link from "next/link";
import { useState } from "react";
import type { HomeData, MonthlyBar } from "@/lib/services/home.service";
import type { Dict } from "@/lib/i18n/types";
import { i } from "@/lib/i18n";
import { LEVEL_DEFS, getAltCount, meetsLevel, getLevelState } from "@/lib/level-utils";
import { RARITIES } from "@/lib/rarity";
import { imgUrl } from "@/lib/storage/image-url";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0]?.toUpperCase() ?? "?";
}

// ─── Monthly chart ────────────────────────────────────────────────────────────

function MonthlyChart({ data, locale }: { data: MonthlyBar[]; locale: string }) {
  const max = Math.max(...data.map((d) => d.summits), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
      {data.map((d) => {
        const totalH = d.summits > 0 ? Math.max(Math.round((d.summits / max) * 64), 8) : 3;
        const label = new Intl.DateTimeFormat(locale, { month: "short" }).format(
          new Date(`${d.isoMonth}-15`)
        );

        type Seg = { rarityId: string; color: string; h: number };
        const segments: Seg[] = [];
        if (d.summits > 0) {
          let usedH = 0;
          const raritiesWithCount = RARITIES.filter((r) => (d.rarityBreakdown[r.id] ?? 0) > 0);
          raritiesWithCount.forEach((r, idx) => {
            const count = d.rarityBreakdown[r.id]!;
            const isLast = idx === raritiesWithCount.length - 1;
            const h = isLast ? totalH - usedH : Math.max(1, Math.round((count / d.summits) * totalH));
            usedH += h;
            segments.push({ rarityId: r.id, color: r.color, h });
          });
        }

        return (
          <div
            key={d.isoMonth}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
          >
            <Link
              href={`/ascents?month=${d.isoMonth}&view=mine`}
              style={{ fontSize: 10, fontWeight: 700, lineHeight: 1, color: d.summits > 0 ? "#0369a1" : "transparent", textDecoration: "none" }}
            >
              {d.summits || "0"}
            </Link>
            <div style={{
              width: "100%", height: totalH,
              borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column-reverse",
              background: d.summits === 0 ? "#e5e7eb" : undefined,
            }}>
              {segments.map((seg, i) => (
                <Link
                  key={i}
                  href={`/ascents?rarity=${seg.rarityId}&view=mine`}
                  style={{ width: "100%", height: seg.h, background: seg.color, flexShrink: 0, display: "block" }}
                  title={seg.rarityId}
                />
              ))}
            </div>
            <Link
              href={`/ascents?month=${d.isoMonth}&view=mine`}
              style={{ fontSize: 10, color: "#94a3b8", textTransform: "capitalize", textDecoration: "none" }}
            >
              {label}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ─── Rarity chart ─────────────────────────────────────────────────────────────

const RARITY_BARS: { key: keyof HomeData["stats"]["rarityBreakdown"]; color: string; label: string }[] =
  RARITIES.map((r) => ({ key: r.id as keyof HomeData["stats"]["rarityBreakdown"], color: r.color, label: r.label }));

function RarityChart({ breakdown }: { breakdown: HomeData["stats"]["rarityBreakdown"] }) {
  const values = RARITY_BARS.map((b) => breakdown[b.key] ?? 0);
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
      {RARITY_BARS.map((b, i) => {
        const val = values[i];
        const barH = val > 0 && max > 0 ? Math.max(Math.round((val / max) * 96), 8) : 3;
        const active = val > 0;
        const inner = (
          <>
            <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1, color: active ? b.color : "transparent" }}>
              {val || "0"}
            </span>
            <div style={{ width: "100%", height: barH, background: active ? b.color : "#e5e7eb", borderRadius: "3px 3px 0 0" }} />
            <span title={b.label} style={{ fontSize: 14, lineHeight: 1, color: active ? b.color : "#e5e7eb", height: 22, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>✿</span>
          </>
        );
        return active ? (
          <Link
            key={b.key}
            href={`/ascents?rarity=${b.key}&view=mine`}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none" }}
          >
            {inner}
          </Link>
        ) : (
          <div key={b.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomeClient({ data, locale, t }: {
  data: HomeData;
  locale: string;
  t: Dict;
}) {
  const { user, stats, leaderboard, userRank, nextRankName, nextRankGap, recentAscents } = data;
  const meEntry = leaderboard.find((e) => e.isCurrentUser);
  const myEp = meEntry?.ep ?? 0;
  const myCS = meEntry?.CS ?? 0;

  // ── Level / progress for hero strip ──────────────────────────────────────
  const levelState = getLevelState(stats);
  // The "in-progress" level is levelState.current (first not-yet-met level)
  const heroInProgress = levelState.current;
  const prevLevelIdx   = levelState.currentIdx - 1;
  const heroPrevTgt    = prevLevelIdx >= 0 ? (LEVEL_DEFS[prevLevelIdx].targetAscents ?? 0) : 0;
  const heroTarget     = heroInProgress.targetAscents ?? 0;
  const heroProgress   = heroTarget > heroPrevTgt
    ? Math.min(1, Math.max(0, (stats.uniquePeaks - heroPrevTgt) / (heroTarget - heroPrevTgt)))
    : 1;

  // Progress strip label: "N / M cimas · AltReq para LevelName"
  const heroProgressBase = i(t.home_levelProgress, { current: stats.uniquePeaks, total: heroTarget });
  const firstAltReq = heroInProgress.altReqs?.[0];
  const altReqLabel = firstAltReq && getAltCount(stats, firstAltReq.threshold) < firstAltReq.count
    ? `${i(t.home_altReq, { m: firstAltReq.threshold.toLocaleString(locale) })} ${i(t.home_heroForLevel, { name: t[heroInProgress.nameKey] as string })}`
    : null;
  const heroProgressLabel = altReqLabel
    ? `${heroProgressBase}  ·  ${altReqLabel}`
    : heroProgressBase;

  const firstName = user.name.split(" ")[0];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 0 64px" }}>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        margin: "12px 12px 0",
        backgroundImage: "url('/brand/hero.png')",
        backgroundSize: "cover",
        backgroundPosition: "center 60%",
        backgroundColor: "#1c2d3f",
      }}>
        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: "linear-gradient(to bottom, rgba(10,20,35,0.22) 0%, rgba(10,20,35,0.55) 55%, rgba(10,20,35,0.88) 100%)",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* ── Top section: avatar + name/pills + metrics ──────────────── */}
          <div style={{ padding: "14px 16px 12px" }}>

            {/* Row: avatar | name·level + CS/EP pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Avatar */}
              <Link href="/profile" style={{ textDecoration: "none", flexShrink: 0 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.75)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                  background: "linear-gradient(145deg,#3a7bd5,#1a4a8a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 700, color: "white",
                }}>
                  {user.avatarUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : initials(user.name)}
                </div>
              </Link>

              {/* Name + level + pills */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name · level */}
                <p style={{ margin: "0 0 5px", fontSize: 18, letterSpacing: "-0.03em", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ fontWeight: 700, color: "#ffffff" }}>{user.name}</span>
                  <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.55)" }}>{"  ·  "}{t[levelState.current.nameKey] as string}</span>
                </p>
                {/* CS + EP pills */}
                <div style={{ display: "flex", gap: 6 }}>
                  {/* CS pill */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "rgba(34,34,34,0.90)", borderRadius: 20,
                    padding: "4px 9px",
                  }}>
                    {/* Cairn icon (stacked ellipses) */}
                    <svg width="11" height="10" viewBox="0 0 20 20" fill="#fbbf24">
                      <ellipse cx="10" cy="17" rx="6" ry="2.5"/>
                      <ellipse cx="10" cy="12" rx="4.5" ry="2"/>
                      <ellipse cx="10" cy="7.5" rx="3" ry="1.8"/>
                      <ellipse cx="10" cy="4" rx="1.8" ry="1.3"/>
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>{myCS} CS</span>
                  </div>
                  {/* EP pill */}
                  <div style={{
                    display: "inline-flex", alignItems: "center",
                    background: "rgba(34,34,34,0.90)", borderRadius: 20,
                    padding: "4px 9px",
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ffffff" }}>{myEp} EP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "12px 0" }} />

            {/* Metrics row: Ascensiones | Cimas | Alt. máx */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MetricCell value={String(stats.totalAscents)} label={t.home_metricAscents} />
              <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
              <MetricCell value={String(stats.uniquePeaks)} label={t.home_metricPeaks} />
              <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
              <MetricCell
                value={stats.maxAltitude > 0 ? stats.maxAltitude.toLocaleString(locale) : "—"}
                label={t.home_metricMaxAlt}
                unit={stats.maxAltitude > 0 ? "m" : undefined}
              />
            </div>
          </div>

          {/* ── Progress strip — solid black full width ─────────────────── */}
          <div style={{
            background: "#000000",
            padding: "10px 16px 14px",
          }}>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {levelState.isMaxLevel ? (t.home_maxLevel as string) : heroProgressLabel}
            </p>
            <div style={{
              height: 9, borderRadius: 5, background: "#334155", overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${(levelState.isMaxLevel ? 1 : heroProgress) * 100}%`,
                borderRadius: 5,
                background: "linear-gradient(90deg, #5fa876, #4a8c5c)",
              }} />
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
            borderRadius: "var(--radius-xl)", padding: "24px 20px",
            textAlign: "center",
          }}>
            <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#14532d", letterSpacing: "-0.02em" }}>
              {t.home_onboarding_title}
            </p>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#166534", lineHeight: 1.5 }}>
              {t.home_onboarding_sub}
            </p>
            <button
              onClick={() => document.dispatchEvent(new CustomEvent("open-ascent-modal"))}
              style={{
                display: "inline-block",
                background: "#16a34a", color: "white",
                padding: "11px 24px", borderRadius: "var(--radius-md)",
                fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
                boxShadow: "0 4px 12px rgba(22,163,74,0.35)",
              }}
            >
              {t.home_onboarding_cta}
            </button>
          </div>
        </div>
      )}

      {/* ── Monthly chart ───────────────────────────────────────────────── */}
      {stats.totalAscents >= 1 && data.monthlyStats.length > 0 && (
        <section style={{ padding: "16px 16px 0" }}>
          <div style={{
            background: "white", border: "1px solid #e5e7eb",
            borderRadius: "var(--radius-lg)", padding: "16px 16px 12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            {(() => {
              const periodMeters  = data.monthlyStats.reduce((s, m) => s + m.metersAscended, 0);
              const periodSummits = data.monthlyStats.reduce((s, m) => s + m.summits, 0);
              return (
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#111827" }}>
                    {t.home_chartTitle}
                  </h2>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>
                      <span style={{ fontWeight: 700, color: "#0369a1" }}>{periodSummits}</span>
                      {" "}{t.home_statSummits.toLowerCase()}
                    </span>
                    {periodMeters > 0 && (
                      <span style={{ fontSize: 13, color: "#6b7280" }}>
                        <span style={{ fontWeight: 700, color: "#111827" }}>
                          {periodMeters.toLocaleString(locale)}
                        </span>
                        {" m "}
                        {t.home_chartMeters}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
            <MonthlyChart data={data.monthlyStats} locale={locale} />
          </div>
        </section>
      )}

      {/* ── Rarity chart ────────────────────────────────────────────────── */}
      {stats.totalAscents >= 1 && (
        <section style={{ padding: "16px 16px 0" }}>
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "var(--radius-lg)", padding: "16px 16px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#111827" }}>
              {t.home_rarityChartTitle}
            </h2>
            <RarityChart breakdown={stats.rarityBreakdown} />
          </div>
        </section>
      )}

      {/* ── Leaderboard ─────────────────────────────────────────────────── */}
      {leaderboard.length > 1 && (
        <section style={{ padding: "20px 16px 0" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>
            {t.home_ranking}
          </h2>
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            {/* Column headers */}
            <div style={{ display: "flex", alignItems: "center", padding: "10px 16px 4px 38px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ flex: 1 }} />
              {(["Cimas", "CS", "EP"] as const).map((col) => (
                <div key={col} style={{ width: col === "EP" ? 44 : 52, textAlign: "center", fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>{col}</div>
              ))}
            </div>

            {leaderboard.slice(0, 5).map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.isCurrentUser;
              const levelName = t[LEVEL_DEFS[(entry.levelIdx - 1 + LEVEL_DEFS.length) % LEVEL_DEFS.length]?.nameKey ?? "home_level1"] as string;
              const isLast = idx === Math.min(leaderboard.length, 5) - 1;

              if (isMe) {
                return (
                  <div key={entry.userId} style={{
                    display: "flex", alignItems: "center",
                    background: "linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)",
                    borderBottom: isLast ? "none" : "1px solid #dbeafe",
                    borderLeft: "3px solid #0369a1",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", flex: 1, padding: "14px 16px 12px 13px", gap: 10 }}>
                      <div style={{ width: 22, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#0369a1", flexShrink: 0 }}>{rank}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {entry.name} <span style={{ fontWeight: 400, color: "#64748b", fontSize: 12 }}>({t.home_youAre})</span>
                        </p>
                        <span style={{ display: "inline-block", marginTop: 2, fontSize: 10, fontWeight: 700, color: "#374151", background: "#f3f4f6", borderRadius: "var(--radius-sm)", padding: "1px 6px" }}>{levelName}</span>
                      </div>
                      <div style={{ width: 52, textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#0369a1", lineHeight: 1 }}>{entry.ascentCount}</div>
                      </div>
                      <div style={{ width: 52, textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#d97706", lineHeight: 1 }}>{entry.CS}</div>
                      </div>
                      <div style={{ width: 44, textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#0369a1", lineHeight: 1 }}>{entry.ep}</div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={entry.userId} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 16px",
                  background: "white",
                  borderBottom: isLast ? "none" : "1px solid #f3f4f6",
                }}>
                  <div style={{ width: 22, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#d1d5db", flexShrink: 0 }}>{rank}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.name}</p>
                    <span style={{ display: "inline-block", marginTop: 1, fontSize: 10, fontWeight: 700, color: "#374151", background: "#f3f4f6", borderRadius: "var(--radius-sm)", padding: "1px 6px" }}>{levelName}</span>
                  </div>
                  <div style={{ width: 52, textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#374151", lineHeight: 1 }}>{entry.ascentCount}</div>
                  </div>
                  <div style={{ width: 52, textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#d97706", lineHeight: 1 }}>{entry.CS}</div>
                  </div>
                  <div style={{ width: 44, textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#374151", lineHeight: 1 }}>{entry.ep}</div>
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
            border: "1.5px dashed #bfdbfe", borderRadius: "var(--radius-lg)", padding: "22px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
            <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#111827" }}>
              {t.home_motivationNoFriends}
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6b7280" }}>
              {t.home_motivationNoFriendsSub}
            </p>
            <Link href="/friends" style={{
              display: "inline-block", background: "#0369a1", color: "white",
              padding: "8px 18px", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              {t.home_inviteFriends}
            </Link>
          </div>
        </section>
      )}

      {/* ── Recent Ascents ──────────────────────────────────────────────── */}
      {recentAscents.length > 0 && (
        <section style={{ padding: "24px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", marginBottom: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
              {t.home_recentAscents}
            </h2>
            <Link href="/ascents?view=mine" style={{ fontSize: 13, fontWeight: 600, color: "#0369a1", textDecoration: "none" }}>
              {t.home_seeAll} →
            </Link>
          </div>

          <div style={{
            display: "flex", gap: 12, overflowX: "auto",
            padding: "4px 16px 8px", scrollbarWidth: "none",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any}>
            {recentAscents.map((a) => (
              <Link key={a.id} href={`/ascents?highlight=${a.id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                <div style={{
                  width: 150, borderRadius: "var(--radius-lg)",
                  border: "1px solid #e5e7eb", overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                }}>
                  <div style={{ height: 120, background: "#e5e7eb", position: "relative", overflow: "hidden" }}>
                    {a.photoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={imgUrl(a.photoUrl, 400)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🏔️</div>
                    }
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
        </section>
      )}

    </div>
  );
}

// ─── Metric cell (hero) ───────────────────────────────────────────────────────

function MetricCell({ value, label, unit }: { value: string; label: string; unit?: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.04em", lineHeight: 1 }}>
        {value}
        {unit && <sup style={{ fontSize: 10, fontWeight: 400, verticalAlign: "super", marginLeft: 1, opacity: 0.55 }}>{unit}</sup>}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 400, color: "rgba(255,255,255,0.65)" }}>{label}</span>
    </div>
  );
}
