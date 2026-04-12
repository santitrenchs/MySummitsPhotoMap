"use client";

import { useState, useCallback, useRef } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserStub = { id: string; name: string; username: string | null };

type FriendEntry     = { id: string; friend: UserStub; createdAt: string };
type IncomingRequest = { id: string; requester: UserStub; createdAt: string };
type SentRequest     = { id: string; addressee: UserStub; createdAt: string };
type BlockedEntry    = { id: string; user: UserStub; createdAt: string };
type PendingTag      = { id: string; personName: string; photoUrl: string; peakName: string; ascentId: string; createdAt: string };

type SearchResult = UserStub & {
  status: "none" | "pending_sent" | "pending_received" | "accepted";
  friendshipId?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.trim().split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
      color: "white", fontWeight: 700, fontSize: size * 0.38,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {initials}
    </div>
  );
}

function UserRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 0", borderBottom: "1px solid #f3f4f6",
    }}>
      {children}
    </div>
  );
}

function Btn({
  onClick, variant = "default", children, disabled,
}: {
  onClick: () => void;
  variant?: "default" | "ghost" | "danger" | "success" | "warning";
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    default: { bg: "#0369a1",  color: "white",   border: "#0369a1" },
    ghost:   { bg: "white",    color: "#6b7280",  border: "#e5e7eb" },
    danger:  { bg: "white",    color: "#ef4444",  border: "#fecaca" },
    success: { bg: "#f0fdf4",  color: "#16a34a",  border: "#bbf7d0" },
    warning: { bg: "#fff7ed",  color: "#ea580c",  border: "#fed7aa" },
  };
  const c = colors[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
        cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap",
        background: c.bg, color: c.color,
        border: `1px solid ${c.border}`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
      {label}
    </h2>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FriendsClient({
  initialFriends,
  initialIncoming,
  initialSent,
  initialBlocked,
  initialPendingTags,
}: {
  initialFriends: FriendEntry[];
  initialIncoming: IncomingRequest[];
  initialSent: SentRequest[];
  initialBlocked: BlockedEntry[];
  initialPendingTags: PendingTag[];
}) {
  const t = useT();
  const [friends, setFriends] = useState(initialFriends);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [sent, setSent] = useState(initialSent);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [pendingTags, setPendingTags] = useState(initialPendingTags);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Build status for quick lookup ──────────────────────────────────────────
  function getStatus(userId: string): { status: SearchResult["status"]; friendshipId?: string } {
    const f = friends.find((x) => x.friend.id === userId);
    if (f) return { status: "accepted", friendshipId: f.id };
    const inc = incoming.find((x) => x.requester.id === userId);
    if (inc) return { status: "pending_received", friendshipId: inc.id };
    const s = sent.find((x) => x.addressee.id === userId);
    if (s) return { status: "pending_sent", friendshipId: s.id };
    return { status: "none" };
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || value.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(value.trim())}`);
        const users: UserStub[] = await res.json();
        setResults(users.map((u) => ({ ...u, ...getStatus(u.id) })));
      } finally {
        setSearching(false);
      }
    }, 350);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends, incoming, sent]);

  // ── Send request ────────────────────────────────────────────────────────────
  async function addFriend(addressee: UserStub) {
    const res = await fetch("/api/friendships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresseeId: addressee.id }),
    });
    if (!res.ok) return;
    const f = await res.json();
    setSent((prev) => [...prev, { id: f.id, addressee, createdAt: f.createdAt }]);
    setResults((prev) => prev.map((r) =>
      r.id === addressee.id ? { ...r, status: "pending_sent", friendshipId: f.id } : r
    ));
  }

  // ── Accept ──────────────────────────────────────────────────────────────────
  async function accept(request: IncomingRequest) {
    const res = await fetch(`/api/friendships/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ACCEPTED" }),
    });
    if (!res.ok) return;
    setIncoming((prev) => prev.filter((r) => r.id !== request.id));
    setFriends((prev) => [...prev, {
      id: request.id,
      friend: request.requester,
      createdAt: new Date().toISOString(),
    }]);
    setResults((prev) => prev.map((r) =>
      r.id === request.requester.id ? { ...r, status: "accepted", friendshipId: request.id } : r
    ));
  }

  // ── Reject ──────────────────────────────────────────────────────────────────
  async function reject(requestId: string) {
    const res = await fetch(`/api/friendships/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REJECTED" }),
    });
    if (!res.ok) return;
    setIncoming((prev) => prev.filter((r) => r.id !== requestId));
    setResults((prev) => prev.map((r) =>
      r.friendshipId === requestId ? { ...r, status: "none", friendshipId: undefined } : r
    ));
  }

  // ── Remove / cancel ─────────────────────────────────────────────────────────
  async function remove(friendshipId: string, userId?: string) {
    const res = await fetch(`/api/friendships/${friendshipId}`, { method: "DELETE" });
    if (!res.ok) return;
    setFriends((prev) => prev.filter((f) => f.id !== friendshipId));
    setSent((prev) => prev.filter((s) => s.id !== friendshipId));
    if (userId) {
      setResults((prev) => prev.map((r) =>
        r.id === userId ? { ...r, status: "none", friendshipId: undefined } : r
      ));
    }
  }

  // ── Block ────────────────────────────────────────────────────────────────────
  async function block(friend: FriendEntry) {
    // id here is the userId to block (the PATCH uses userId, not friendshipId)
    const res = await fetch(`/api/friendships/${friend.friend.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "BLOCKED" }),
    });
    if (!res.ok) return;
    const newEntry = await res.json();
    setFriends((prev) => prev.filter((f) => f.id !== friend.id));
    setBlocked((prev) => [...prev, { id: newEntry.id, user: friend.friend, createdAt: new Date().toISOString() }]);
  }

  // ── Unblock ──────────────────────────────────────────────────────────────────
  async function unblock(entry: BlockedEntry) {
    const res = await fetch(`/api/friendships/${entry.user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "UNBLOCKED" }),
    });
    if (!res.ok) return;
    setBlocked((prev) => prev.filter((b) => b.id !== entry.id));
  }

  // ── Tag approval ─────────────────────────────────────────────────────────────
  async function approveTag(tagId: string) {
    const res = await fetch(`/api/face-tags/${tagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ACCEPTED" }),
    });
    if (!res.ok) return;
    setPendingTags((prev) => prev.filter((t) => t.id !== tagId));
  }

  async function rejectTag(tagId: string) {
    const res = await fetch(`/api/face-tags/${tagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REJECTED" }),
    });
    if (!res.ok) return;
    setPendingTags((prev) => prev.filter((t) => t.id !== tagId));
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Search ── */}
      <div style={{ position: "relative", marginBottom: 24 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t.friends_searchPlaceholder}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 14px 10px 40px",
            border: "1px solid #e5e7eb", borderRadius: 10,
            fontSize: 14, outline: "none",
            background: "#f9fafb",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#0369a1")}
          onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
        />
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        {/* Results dropdown */}
        {query.trim().length >= 2 && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
            background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)", overflow: "hidden",
          }}>
            {searching ? (
              <p style={{ padding: "12px 14px", fontSize: 13, color: "#9ca3af", margin: 0 }}>…</p>
            ) : results.length === 0 ? (
              <p style={{ padding: "12px 14px", fontSize: 13, color: "#9ca3af", margin: 0 }}>{t.friends_noResults}</p>
            ) : (
              results.map((user) => (
                <div key={user.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderBottom: "1px solid #f3f4f6",
                }}>
                  <Avatar name={user.name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{user.name}</p>
                    {user.username && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>@{user.username}</p>}
                  </div>
                  {user.status === "none" && (
                    <Btn onClick={() => addFriend(user)}>{t.friends_add}</Btn>
                  )}
                  {user.status === "pending_sent" && (
                    <Btn variant="ghost" onClick={() => remove(user.friendshipId!, user.id)}>{t.friends_requestSent}</Btn>
                  )}
                  {user.status === "pending_received" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn onClick={() => accept(incoming.find((r) => r.id === user.friendshipId)!)}>{t.friends_accept}</Btn>
                      <Btn variant="ghost" onClick={() => reject(user.friendshipId!)}>{t.friends_reject}</Btn>
                    </div>
                  )}
                  {user.status === "accepted" && (
                    <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓ {t.friends_alreadyFriends}</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Pending tags ── */}
      {pendingTags.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label={i(t.tags_pendingCount, { n: pendingTags.length })} />
          {pendingTags.map((tag) => (
            <div key={tag.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0", borderBottom: "1px solid #f3f4f6",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tag.photoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{tag.personName}</p>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>
                  {t.tags_taggedIn} · {tag.peakName}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn onClick={() => approveTag(tag.id)}>{t.tags_approve}</Btn>
                <Btn variant="ghost" onClick={() => rejectTag(tag.id)}>{t.tags_reject}</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Incoming requests ── */}
      {incoming.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label={i(t.friends_pendingSection, { n: incoming.length })} />
          {incoming.map((req) => (
            <UserRow key={req.id}>
              <Avatar name={req.requester.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{req.requester.name}</p>
                {req.requester.username && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>@{req.requester.username}</p>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn onClick={() => accept(req)}>{t.friends_accept}</Btn>
                <Btn variant="ghost" onClick={() => reject(req.id)}>{t.friends_reject}</Btn>
              </div>
            </UserRow>
          ))}
        </div>
      )}

      {/* ── Friends list ── */}
      {friends.length === 0 && incoming.length === 0 && pendingTags.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", border: "1px dashed #e5e7eb", borderRadius: 12 }}>
          <p style={{ fontSize: 32, margin: "0 0 8px" }}>🏔</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", margin: 0 }}>{t.friends_noFriends}</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0" }}>{t.friends_noFriendsSub}</p>
        </div>
      ) : friends.length > 0 && (
        <div>
          <SectionHeader label={`${t.friends_title} · ${friends.length}`} />
          {friends.map((f) => (
            <UserRow key={f.id}>
              <Avatar name={f.friend.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{f.friend.name}</p>
                {f.friend.username && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>@{f.friend.username}</p>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="danger" onClick={() => remove(f.id, f.friend.id)}>{t.friends_remove}</Btn>
                <Btn variant="warning" onClick={() => block(f)}>{t.friends_block}</Btn>
              </div>
            </UserRow>
          ))}
        </div>
      )}

      {/* ── Sent requests ── */}
      {sent.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionHeader label={`${t.friends_requestSent} · ${sent.length}`} />
          {sent.map((s) => (
            <UserRow key={s.id}>
              <Avatar name={s.addressee.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{s.addressee.name}</p>
                {s.addressee.username && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>@{s.addressee.username}</p>}
              </div>
              <Btn variant="ghost" onClick={() => remove(s.id, s.addressee.id)}>{t.friends_cancel}</Btn>
            </UserRow>
          ))}
        </div>
      )}

      {/* ── Blocked users ── */}
      {blocked.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionHeader label={`${t.friends_blockedSection} · ${blocked.length}`} />
          {blocked.map((b) => (
            <UserRow key={b.id}>
              <Avatar name={b.user.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{b.user.name}</p>
                {b.user.username && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>@{b.user.username}</p>}
              </div>
              <Btn variant="ghost" onClick={() => unblock(b)}>{t.friends_unblock}</Btn>
            </UserRow>
          ))}
        </div>
      )}
    </div>
  );
}
