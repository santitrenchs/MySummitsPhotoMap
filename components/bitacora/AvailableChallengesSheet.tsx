"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import { SearchField } from "@/components/ui/SearchField";
import type { ChallengeAvailable } from "./ChallengesTab";

const ACCENT = "#2F7A5F";

type Props = {
  isOpen: boolean;
  available: ChallengeAvailable[];
  onClose: () => void;
  onJoined: (challenge: ChallengeAvailable) => void;
};

/**
 * Discovery surface for challenges the user has not joined.
 *
 * Cards with cover art live here and nowhere else: this is the moment where a challenge
 * has to look appealing. Once joined it becomes a flat row in the list, like the
 * friends/cordadas screen.
 */
export function AvailableChallengesSheet({ isOpen, available, onClose, onJoined }: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((c) => c.name.toLowerCase().includes(q));
  }, [available, query]);

  async function join(challenge: ChallengeAvailable) {
    setJoiningId(challenge.id);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/join`, { method: "POST" });
      if (!res.ok) return;
      onJoined(challenge);
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)",
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 301,
          background: "white", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          maxHeight: "82svh", display: "flex", flexDirection: "column",
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: isOpen ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.34s cubic-bezier(0.32,0.72,0,1)",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.14)",
        }}
      >
        <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "12px auto 0", flexShrink: 0 }} />

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px 12px", flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 17, fontWeight: 800, color: "#0D2538", letterSpacing: "-0.3px",
          }}>
            {t.challenges_availableTitle}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, lineHeight: 1 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search — client-side over the sheet's own list. The catalogue is curated and
            small, so there is nothing to gain from a server round-trip here. */}
        {available.length > 0 && (
          <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={t.challenges_availableSearch}
              variant="filled"
              clearLabel={t.cancel}
            />
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1, padding: "0 16px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          {available.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 13, color: "#94A3B8", padding: "22px 0" }}>
              {t.challenges_allJoined}
            </p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 13, color: "#94A3B8", padding: "22px 0" }}>
              {t.challenges_noAvailable}
            </p>
          ) : (
            filtered.map((c) => (
              <AvailableCard
                key={c.id}
                challenge={c}
                joining={joiningId === c.id}
                onJoin={() => join(c)}
                joinLabel={t.challenges_join}
                joiningLabel={t.challenges_joining}
                peaksLabel={i(t.challenges_peaksCount, { n: c.totalPeaks })}
                joinedLabel={t.challenges_joinedBadge}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function AvailableCard({
  challenge, joining, onJoin, joinLabel, joiningLabel, peaksLabel, joinedLabel,
}: {
  challenge: ChallengeAvailable;
  joining: boolean;
  onJoin: () => void;
  joinLabel: string;
  joiningLabel: string;
  peaksLabel: string;
  joinedLabel: string;
}) {
  // A joined challenge stays listed but reads as already taken: dimmed, with a tick
  // where the join button was. Hiding it would make what you just joined disappear.
  const joined = challenge.isJoined;
  return (
    <div style={{
      display: "flex", background: joined ? "#F8FAFC" : "white", borderRadius: "var(--radius-lg)",
      border: "1px solid rgba(13,37,56,0.06)",
      boxShadow: joined ? "none" : "0 1px 3px rgba(13,37,56,0.06), 0 4px 12px rgba(13,37,56,0.05)",
      overflow: "hidden", opacity: joined ? 0.72 : 1,
    }}>
      <div style={{
        width: 74, flexShrink: 0, position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: challenge.coverUrl ? undefined : "linear-gradient(160deg,#8fd6b4,#2F7A5F)",
      }}>
        {challenge.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={challenge.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <svg viewBox="0 0 24 24" width="32" height="32" fill="rgba(255,255,255,0.55)">
            <path d="M2 19 L9 7 L13 13 L16 8 L22 19 Z" />
          </svg>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, padding: "11px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 14.5, fontWeight: 700, color: "#0D2538", letterSpacing: "-0.01em", lineHeight: 1.2,
          }}>
            {challenge.name}
          </span>
          <span style={{
            flexShrink: 0, fontFamily: "var(--font-mono-landing, monospace)",
            fontSize: 10, fontWeight: 700, color: "#5A6E84",
            background: "#F1F5F9", borderRadius: "var(--radius-full)", padding: "3px 8px", whiteSpace: "nowrap",
          }}>
            {peaksLabel}
          </span>
        </div>

        {challenge.description && (
          <div style={{ fontSize: 12, color: "#5A6E84", lineHeight: 1.4 }}>{challenge.description}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 2 }}>
          {joined ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#5A6E84" }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%", background: ACCENT,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {joinedLabel}
            </span>
          ) : (
          <button
            onClick={onJoin}
            disabled={joining}
            style={{
              fontSize: 14, fontWeight: 600, color: "white",
              background: ACCENT, border: "none", borderRadius: 10,
              padding: "9px 20px", cursor: joining ? "default" : "pointer",
              opacity: joining ? 0.7 : 1,
            }}
          >
            {joining ? joiningLabel : joinLabel}
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
