"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import type { ChallengeSummary, ChallengeAvailable } from "@/lib/services/challenge.service";
import { AvailableChallengesSheet } from "./AvailableChallengesSheet";

// Types come straight from the service: `import type` is erased at build time, so no
// server code reaches the client, and the shapes cannot drift apart.
export type {
  ChallengeSummary,
  ChallengeAvailable,
} from "@/lib/services/challenge.service";

const ACCENT = "#2F7A5F";

export function ChallengesTab() {
  const t = useT();
  const [mine, setMine] = useState<ChallengeSummary[]>([]);
  const [available, setAvailable] = useState<ChallengeAvailable[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges");
      if (!res.ok) return;
      const data = await res.json();
      setMine(data.mine ?? []);
      setAvailable(data.available ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mine;
    return mine.filter((c) => c.name.toLowerCase().includes(q));
  }, [mine, query]);

  /** Joining moves the challenge from the sheet into the list without a full reload. */
  function handleJoined(joined: ChallengeAvailable) {
    setAvailable((prev) => prev.map((c) => (c.id === joined.id ? { ...c, isJoined: true } : c)));
    setMine((prev) => [
      ...prev,
      { ...joined, completedPeaks: 0, isActive: true },
    ]);
    // Reconcile with the server: progress may already be > 0 if the user has
    // ascents on these peaks, which the optimistic row cannot know.
    load();
  }

  if (loading) {
    return <div style={{ padding: "40px 0", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>…</div>;
  }

  return (
    <div style={{ background: "#F4F7FA", margin: "0 -16px", padding: "0 16px 32px" }}>
      {/* Search + Add — same shapes as the Amigos/Cordadas header (grey field, radius 12,
          height 44) rather than bespoke ones, so the two screens read as one system. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 12 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
          background: "#f3f4f6", borderRadius: 12, padding: "0 12px", height: 44,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.challenges_searchPlaceholder}
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, color: "#111827", minWidth: 0 }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label={t.cancel}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#9ca3af" }}
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "0 14px", height: 44, borderRadius: 12, border: "none",
            background: ACCENT, color: "white",
            fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t.challenges_add}
        </button>
      </div>

      <p style={{
        fontFamily: "var(--font-space-grotesk, sans-serif)",
        fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
        color: "#94A3B8", margin: "12px 0 8px 2px",
      }}>
        {i(t.challenges_countActive, { n: mine.length })}
        {" · "}
        {i(t.challenges_countAvailable, { n: available.filter((c) => !c.isJoined).length })}
      </p>

      {mine.length === 0 ? (
        <EmptyState title={t.challenges_emptyTitle} body={t.challenges_emptyBody} />
      ) : filtered.length === 0 ? (
        <EmptyState title={t.challenges_noSearchMatch} />
      ) : (
        <div style={{
          background: "white", borderRadius: "var(--radius-lg)", border: "1px solid #E5E7EB",
          overflow: "hidden",
        }}>
          {filtered.map((c, idx) => (
            <ChallengeRow key={c.id} challenge={c} isFirst={idx === 0} />
          ))}
        </div>
      )}

      <AvailableChallengesSheet
        isOpen={sheetOpen}
        available={available}
        onClose={() => setSheetOpen(false)}
        onJoined={handleJoined}
      />
    </div>
  );
}

// ── Flat row ──────────────────────────────────────────────────────────────────

function ChallengeRow({ challenge, isFirst }: { challenge: ChallengeSummary; isFirst: boolean }) {
  const t = useT();
  const pct = challenge.totalPeaks > 0
    ? Math.round((challenge.completedPeaks / challenge.totalPeaks) * 100)
    : 0;
  const remaining = challenge.totalPeaks - challenge.completedPeaks;

  return (
    <a
      href={`/bitacora/retos/${challenge.id}`}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 12,
        padding: "13px 14px", textDecoration: "none",
        // Inset divider: starts after the icon column, like the friends/cordadas list.
        borderTop: isFirst ? "none" : "1px solid transparent",
        backgroundImage: isFirst
          ? "none"
          : "linear-gradient(to right, transparent 0 52px, #F1F5F9 52px 100%)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 1px",
        backgroundPosition: "top left",
      }}
    >
      <div style={{
        flexShrink: 0, width: 40, height: 40, borderRadius: "50%",
        background: challenge.coverUrl ? undefined : "rgba(47,122,95,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        {challenge.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={challenge.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
            <path d="M2 19 L9 7 L13 13 L16 8 L22 19 Z" fill={ACCENT} />
          </svg>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 14, fontWeight: 700, color: "#0D2538", letterSpacing: "-0.01em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {challenge.name}
          </span>
          <span style={{
            flexShrink: 0, fontFamily: "var(--font-mono-landing, monospace)",
            fontSize: 11.5, fontWeight: 700, color: "#5A6E84",
          }}>
            {i(t.challenges_progress, { done: challenge.completedPeaks, total: challenge.totalPeaks })}
          </span>
        </div>

        <div style={{ height: 3, borderRadius: 999, background: "#EDF1F5", marginTop: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: ACCENT }} />
        </div>

        <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 4 }}>
          {remaining === 0 ? t.challenges_completed : i(t.challenges_remaining, { n: remaining })}
        </div>
      </div>

      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: "#C7D0D9" }}>
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div style={{
      background: "white", borderRadius: "var(--radius-lg)", border: "1px solid #E5E7EB",
      padding: "32px 24px", textAlign: "center",
    }}>
      <div style={{
        fontFamily: "var(--font-space-grotesk, sans-serif)",
        fontSize: 15, fontWeight: 700, color: "#0D2538", marginBottom: body ? 6 : 0,
      }}>
        {title}
      </div>
      {body && <div style={{ fontSize: 13, color: "#5A6E84", lineHeight: 1.5 }}>{body}</div>}
    </div>
  );
}
