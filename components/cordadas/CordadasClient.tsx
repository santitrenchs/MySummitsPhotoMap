"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";
import { LEVEL_DEFS } from "@/lib/level-utils";
import type { FriendEntry } from "@/lib/services/friendship.service";
import type { CordadaSummary, CordadaInvite } from "@/lib/services/cordada.service";

type UserSearchResult = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  levelIdx: number;
  uniquePeaks: number;
};

// ── Types ──────────────────────────────────────────────────────────────────────

type IncomingRequest = {
  friendshipId: string;
  userId: string;
  name: string;
  username: string | null;
};

type SentRequest = {
  friendshipId: string;
  userId: string;
  name: string;
  username: string | null;
};

type Props = {
  userId: string;
  friends: FriendEntry[];
  incomingRequests: IncomingRequest[];
  sentRequests: SentRequest[];
  cordadas: CordadaSummary[];
  cordadaInvites: CordadaInvite[];
};

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({
  name,
  avatarUrl,
  size = 44,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const initials = name
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
      color: "white", fontSize: size * 0.35, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", flexShrink: 0,
      border: "1.5px solid rgba(255,255,255,0.8)",
      boxShadow: "0 0 0 1.5px #e0e7ef",
    }}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : initials}
    </div>
  );
}

// ── CordadaAvatar — initials with gradient bg based on name ───────────────────

function CordadaAvatar({
  name,
  avatarUrl,
  size = 44,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const initial = name[0]?.toUpperCase() ?? "C";
  const gradients = [
    "linear-gradient(135deg, #2F7A5F 0%, #52C09A 100%)",
    "linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)",
    "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
    "linear-gradient(135deg, #b45309 0%, #fbbf24 100%)",
    "linear-gradient(135deg, #be123c 0%, #fb7185 100%)",
  ];
  const bg = gradients[name.charCodeAt(0) % gradients.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, flexShrink: 0,
      background: avatarUrl ? undefined : bg,
      overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 700, color: "white",
    }}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : initial}
    </div>
  );
}

// ── Member avatar stack ────────────────────────────────────────────────────────

function MemberAvatarStack({
  avatars,
  count,
}: {
  avatars: (string | null)[];
  count: number;
}) {
  const shown = avatars.slice(0, 3);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((url, i) => (
        <div key={i} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: shown.length - i }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%", border: "1.5px solid white",
            background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
            overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, color: "white",
          }}>
            {url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : "?"
            }
          </div>
        </div>
      ))}
      {count > shown.length && (
        <div style={{
          marginLeft: -8,
          width: 24, height: 24, borderRadius: "50%", border: "1.5px solid white",
          background: "#e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, color: "#6b7280",
        }}>
          +{count - shown.length}
        </div>
      )}
    </div>
  );
}

// ── Row divider ────────────────────────────────────────────────────────────────

function InsetRule() {
  return <div style={{ height: 1, background: "#f3f4f6", marginLeft: 72 }} />;
}

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "16px 16px 6px",
      fontSize: 11, fontWeight: 700, color: "#9ca3af",
      letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
      {children}
    </div>
  );
}

// ── Level pill ─────────────────────────────────────────────────────────────────

function LevelPill({ levelIdx }: { levelIdx: number }) {
  const t = useT();
  const level = levelIdx >= 1 ? LEVEL_DEFS[levelIdx - 1] : null;
  if (!level) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, color: "#6b7280",
      background: "#f3f4f6", borderRadius: 20, padding: "2px 7px",
      whiteSpace: "nowrap",
    }}>
      {level.emoji} {t[level.nameKey]}
    </span>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function CordadasClient({
  userId,
  friends,
  incomingRequests,
  sentRequests,
  cordadas,
  cordadaInvites,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // User search (add friend)
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const existingFriendIds = new Set(friends.map((f) => f.friend.id));
  const sentRequestIds = new Set(sentRequests.map((r) => r.userId));

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/v1/users/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults((data.users ?? []).filter((u: UserSearchResult) =>
            !existingFriendIds.has(u.id) && !sentRequestIds.has(u.id)
          ));
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function sendFriendRequest(userId: string) {
    setActionLoading(`add-${userId}`);
    try {
      await fetch("/api/friendships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: userId }),
      });
      setSentIds((prev) => new Set([...prev, userId]));
    } finally {
      setActionLoading(null);
    }
  }

  // Total pending = friend requests + cordada invites
  const totalPending = incomingRequests.length + cordadaInvites.length;

  // Filter combined list by search query
  const q = query.trim().toLowerCase();
  const filteredFriends = q
    ? friends.filter((f) =>
        (f.friend.name ?? "").toLowerCase().includes(q) ||
        (f.friend.username ?? "").toLowerCase().includes(q)
      )
    : friends;
  const filteredCordadas = q
    ? cordadas.filter((c) => c.name.toLowerCase().includes(q))
    : cordadas;

  async function acceptFriend(friendshipId: string) {
    setActionLoading(`accept-${friendshipId}`);
    try {
      await fetch(`/api/friendships/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPTED" }),
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectFriend(friendshipId: string) {
    setActionLoading(`reject-${friendshipId}`);
    try {
      await fetch(`/api/friendships/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECTED" }),
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  async function acceptCordadaInvite(cordadaId: string) {
    setActionLoading(`cordada-accept-${cordadaId}`);
    try {
      await fetch(`/api/v1/cordadas/${cordadaId}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPTED" }),
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectCordadaInvite(cordadaId: string) {
    setActionLoading(`cordada-reject-${cordadaId}`);
    try {
      await fetch(`/api/v1/cordadas/${cordadaId}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECTED" }),
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  // Combined alphabetical list: friends + cordadas interleaved
  type ListItem =
    | { type: "friend"; data: FriendEntry }
    | { type: "cordada"; data: CordadaSummary };

  const combined: ListItem[] = [
    ...filteredFriends.map((f) => ({ type: "friend" as const, data: f })),
    ...filteredCordadas.map((c) => ({ type: "cordada" as const, data: c })),
  ].sort((a, b) => {
    const nameA = a.type === "friend" ? (a.data.friend.username ?? a.data.friend.name ?? "") : a.data.name;
    const nameB = b.type === "friend" ? (b.data.friend.username ?? b.data.friend.name ?? "") : b.data.name;
    return nameA.localeCompare(nameB);
  });

  const hasPending = totalPending > 0;
  const isEmpty = combined.length === 0 && !hasPending;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 80 }}>

      {/* ── Search bar ─────────────────────────────── */}
      <div style={{ padding: "12px 16px 8px", position: "sticky", top: "var(--top-nav-h, 52px)", zIndex: 20, background: "white" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#f3f4f6", borderRadius: 12, padding: "0 12px", height: 44,
        }}>
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.friends_searchPlaceholder}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 15, color: "#111827",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#9ca3af" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Pending section ────────────────────────── */}
      {hasPending && !q && (
        <div>
          <SectionLabel>
            Solicitudes · {totalPending}
          </SectionLabel>
          <div style={{ background: "white" }}>
            {incomingRequests.map((req, i) => (
              <div key={req.friendshipId}>
                <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 12 }}>
                  <Avatar name={req.name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                      {req.name}
                    </div>
                    {req.username && (
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>@{req.username}</div>
                    )}
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
                      Solicitud de amistad
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => acceptFriend(req.friendshipId)}
                      disabled={!!actionLoading}
                      style={{
                        padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: "#dcfce7", color: "#16a34a", fontSize: 13, fontWeight: 600,
                      }}
                    >
                      {t.friends_accept}
                    </button>
                    <button
                      onClick={() => rejectFriend(req.friendshipId)}
                      disabled={!!actionLoading}
                      style={{
                        padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                        background: "none", color: "#6b7280", fontSize: 13, fontWeight: 500,
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {t.friends_reject}
                    </button>
                  </div>
                </div>
                {i < incomingRequests.length - 1 && <InsetRule />}
              </div>
            ))}
            {incomingRequests.length > 0 && cordadaInvites.length > 0 && <InsetRule />}
            {cordadaInvites.map((inv, i) => (
              <div key={inv.cordadaId}>
                <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 12 }}>
                  <CordadaAvatar name={inv.name} avatarUrl={inv.avatarUrl} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                      {inv.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Invitación de {inv.ownerName}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => acceptCordadaInvite(inv.cordadaId)}
                      disabled={!!actionLoading}
                      style={{
                        padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: "#dcfce7", color: "#16a34a", fontSize: 13, fontWeight: 600,
                      }}
                    >
                      {t.friends_accept}
                    </button>
                    <button
                      onClick={() => rejectCordadaInvite(inv.cordadaId)}
                      disabled={!!actionLoading}
                      style={{
                        padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                        background: "none", color: "#6b7280", fontSize: 13, fontWeight: 500,
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {t.friends_reject}
                    </button>
                  </div>
                </div>
                {i < cordadaInvites.length - 1 && <InsetRule />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main list ─────────────────────────────── */}
      {combined.length > 0 && (
        <div>
          {!q && (
            <SectionLabel>
              {friends.length} {friends.length === 1 ? "amigo" : "amigos"} · {cordadas.length} {cordadas.length === 1 ? "cordada" : "cordadas"}
            </SectionLabel>
          )}
          {q && (
            <SectionLabel>
              {combined.length} resultado{combined.length !== 1 ? "s" : ""}
            </SectionLabel>
          )}
          <div style={{ background: "white" }}>
            {combined.map((item, i) => (
              <div key={item.type === "friend" ? item.data.id : item.data.id}>
                {item.type === "friend"
                  ? <FriendRow entry={item.data} />
                  : <CordadaRow cordada={item.data} />
                }
                {i < combined.length - 1 && <InsetRule />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add friend search results ─────────────── */}
      {query.trim().length >= 2 && (
        <div>
          <SectionLabel>{t.friends_addSection}</SectionLabel>
          <div style={{ background: "white" }}>
            {searchLoading && (
              <div style={{ padding: "16px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>…</div>
            )}
            {!searchLoading && searchResults.length === 0 && (
              <div style={{ padding: "16px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                {t.friends_noResults}
              </div>
            )}
            {searchResults.map((user, i) => {
              const isSent = sentIds.has(user.id);
              const level = user.levelIdx >= 1 ? LEVEL_DEFS[user.levelIdx - 1] : null;
              return (
                <div key={user.id}>
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 12 }}>
                    <Avatar name={user.name ?? "?"} avatarUrl={user.avatarUrl} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                        {user.username ? `@${user.username}` : user.name}
                      </div>
                      {level && (
                        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
                          {level.emoji} {t[level.nameKey]} · {user.uniquePeaks} cimas
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => !isSent && sendFriendRequest(user.id)}
                      disabled={isSent || actionLoading === `add-${user.id}`}
                      style={{
                        padding: "7px 14px", borderRadius: 8, border: "none", flexShrink: 0,
                        cursor: isSent ? "default" : "pointer",
                        background: isSent ? "#f3f4f6" : "#2F7A5F",
                        color: isSent ? "#9ca3af" : "white",
                        fontSize: 13, fontWeight: 600,
                        opacity: actionLoading === `add-${user.id}` ? 0.6 : 1,
                      }}
                    >
                      {isSent ? t.friends_requestSent : t.friends_add}
                    </button>
                  </div>
                  {i < searchResults.length - 1 && <InsetRule />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────── */}
      {isEmpty && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "56px 32px", textAlign: "center", gap: 10,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TwoUsersIcon />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>
            {t.friends_noFriends}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            {t.friends_noFriendsSub}
          </div>
        </div>
      )}

      {q && combined.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px", fontSize: 14, color: "#9ca3af" }}>
          {t.friends_noResults}
        </div>
      )}

      {/* ── FAB (+) ───────────────────────────────── */}
      <Link
        href="/cordadas/add"
        style={{
          position: "fixed", bottom: "calc(env(safe-area-inset-bottom) + 72px)", right: 20,
          width: 52, height: 52, borderRadius: "50%",
          background: "#2F7A5F",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(47,122,95,0.4)",
          textDecoration: "none", zIndex: 50,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5V19" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M5 12H19" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </Link>
    </div>
  );
}

// ── FriendRow ──────────────────────────────────────────────────────────────────

function FriendRow({ entry }: { entry: FriendEntry }) {
  const { friend } = entry;
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 12 }}>
      <Avatar name={friend.name ?? "?"} avatarUrl={friend.avatarUrl} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600, color: "#111827",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {friend.username ? `@${friend.username}` : friend.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
          <LevelPill levelIdx={friend.levelIdx} />
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{friend.uniquePeaks} cimas</span>
        </div>
      </div>
    </div>
  );
}

// ── CordadaRow ─────────────────────────────────────────────────────────────────

function CordadaRow({ cordada }: { cordada: CordadaSummary }) {
  return (
    <Link
      href={`/cordadas/${cordada.id}`}
      style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 12, textDecoration: "none" }}
    >
      <CordadaAvatar name={cordada.name} avatarUrl={cordada.avatarUrl} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600, color: "#111827",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {cordada.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
          <MemberAvatarStack avatars={cordada.memberAvatars} count={cordada.memberCount} />
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            {cordada.memberCount} {cordada.memberCount === 1 ? "miembro" : "miembros"}
          </span>
          {cordada.myRole === "OWNER" && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: "#0369a1",
              background: "#eff6ff", borderRadius: 20, padding: "2px 7px",
            }}>
              Admin
            </span>
          )}
        </div>
      </div>
      <ChevronRightIcon />
    </Link>
  );
}

// ── Small icons ────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function TwoUsersIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
    </svg>
  );
}
