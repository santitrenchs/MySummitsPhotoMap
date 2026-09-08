"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";
import { BackBreadcrumb } from "@/components/ui/BackBreadcrumb";
import { LEVEL_DEFS } from "@/lib/level-utils";
import type { FriendEntry } from "@/lib/services/friendship.service";

function Avatar({ name, avatarUrl, size = 44 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = name.trim().split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
      color: "white", fontSize: size * 0.35, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", border: "1.5px solid rgba(255,255,255,0.8)",
      boxShadow: "0 0 0 1.5px #e0e7ef",
    }}>
      {avatarUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initials}
    </div>
  );
}

// ── Cordada avatar (no-photo fallback) ────────────────────────────────────────

function CordadaAvatar({ name, size = 68 }: { name: string; size?: number }) {
  const initials = name.trim().split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
      color: "white", fontSize: size * 0.35, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {initials}
    </div>
  );
}

export function CordadaInviteClient({
  cordadaId,
  cordadaName,
  cordadaAvatarUrl,
  memberCount,
  invitableFriends,
}: {
  cordadaId: string;
  cordadaName: string;
  cordadaAvatarUrl: string | null;
  memberCount: number;
  invitableFriends: FriendEntry[];
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? invitableFriends.filter((f) =>
        (f.friend.name ?? "").toLowerCase().includes(q) ||
        (f.friend.username ?? "").toLowerCase().includes(q)
      )
    : invitableFriends;

  async function invite(userId: string) {
    setLoading(userId);
    try {
      const res = await fetch(`/api/v1/cordadas/${cordadaId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) setInvited((prev) => new Set([...prev, userId]));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 80 }}>

      {/* ── Hero ─────────────────────────────────── */}
      {/* Same breadcrumb as the cordada detail and the challenge detail. Here it points
          back to the cordada, not to the list — that is where the user came from. */}
      <div style={{ padding: "14px 16px 0" }}>
        <BackBreadcrumb href={`/cordadas/${cordadaId}`} label={cordadaName} />
      </div>

      {cordadaAvatarUrl ? (
        // Since the breadcrumb pushed it off the top edge, the cover no longer bleeds:
        // it takes the same 16px side margin as the rest of the column and the card
        // radius, so it reads as a deliberate card instead of a band that fell short.
        // overflow:hidden is what clips the scrim and the name to the rounded corners.
        <div style={{
          position: "relative", margin: "10px 16px 0",
          borderRadius: "var(--radius-lg)", overflow: "hidden",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cordadaAvatarUrl}
            alt={cordadaName}
            style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
          }} />
          <div style={{ position: "absolute", bottom: 14, left: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1.2 }}>
              {cordadaName}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "10px 16px 0", display: "flex", alignItems: "center", gap: 14 }}>
          <CordadaAvatar name={cordadaName} size={68} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0D2538", lineHeight: 1.2 }}>
              {cordadaName}
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
              {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 1, background: "#f3f4f6", margin: "16px 0 0" }} />

      {/* ── Invite title ─────────────────────────── */}
      <div style={{ padding: "16px 16px 8px" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0D2538", margin: 0 }}>
          {t.cordadas_inviteTitle}
        </h1>
      </div>

      {/* ── Search ───────────────────────────────── */}
      <div style={{ padding: "0 16px 8px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#f3f4f6", borderRadius: 12, padding: "0 12px", height: 44,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.friends_searchPlaceholder}
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, color: "#111827" }}
          />
        </div>
      </div>

      {/* ── Empty ────────────────────────────────── */}
      {invitableFriends.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af", fontSize: 14 }}>
          {t.cordadas_allInvited}
        </div>
      )}

      {/* ── Friend list ──────────────────────────── */}
      <div style={{ background: "white" }}>
        {filtered.map((entry, i) => {
          const { friend } = entry;
          const level = friend.levelIdx >= 1 ? LEVEL_DEFS[friend.levelIdx - 1] : null;
          const isInvited = invited.has(friend.id);
          return (
            <div key={friend.id}>
              <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 12 }}>
                <Avatar name={friend.name ?? "?"} avatarUrl={friend.avatarUrl} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                    {friend.name}
                  </div>
                  {level && (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
                      {t[level.nameKey]} · {friend.uniquePeaks} cimas
                    </div>
                  )}
                </div>
                <button
                  onClick={() => !isInvited && invite(friend.id)}
                  disabled={isInvited || loading === friend.id}
                  style={{
                    padding: "7px 16px", borderRadius: 8, cursor: isInvited ? "default" : "pointer",
                    background: "none",
                    border: `1.5px solid ${isInvited ? "#e5e7eb" : "#2F7A5F"}`,
                    color: isInvited ? "#9ca3af" : "#2F7A5F",
                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                    opacity: loading === friend.id ? 0.5 : 1,
                  }}
                >
                  {isInvited ? t.cordadas_invited : loading === friend.id ? "…" : t.cordadas_invite}
                </button>
              </div>
              {i < filtered.length - 1 && (
                <div style={{ height: 1, background: "#f3f4f6", marginLeft: 72 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
