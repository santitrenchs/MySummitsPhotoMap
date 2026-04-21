"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserStub = { id: string; name: string; username: string | null };

type FriendEntry     = { id: string; friend: UserStub; createdAt: string };
type IncomingRequest = { id: string; requester: UserStub; createdAt: string };
type SentRequest     = { id: string; addressee: UserStub; createdAt: string };
type BlockedEntry    = { id: string; user: UserStub; createdAt: string };

type SearchResult = UserStub & {
  status: "none" | "pending_sent" | "pending_received" | "accepted";
  friendshipId?: string;
};

type InvitationEntry = {
  id: string;
  inviteeEmail: string;
  usedCount: number;
  expiresAt: string;
  createdAt: string;
};

type PersonStub = {
  id: string;
  name: string;
  email: string | null;
  userId: string | null;
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
}: {
  initialFriends: FriendEntry[];
  initialIncoming: IncomingRequest[];
  initialSent: SentRequest[];
  initialBlocked: BlockedEntry[];
}) {
  const t = useT();
  const [friends, setFriends] = useState(initialFriends);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [sent, setSent] = useState(initialSent);
  const [blocked, setBlocked] = useState(initialBlocked);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    function handleClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-friend-menu]")) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => { setVisibleCount(20); }, [query]);

  const filteredFriends = query.trim().length >= 2
    ? friends.filter((f) =>
        f.friend.name.toLowerCase().includes(query.toLowerCase()) ||
        f.friend.username?.toLowerCase().includes(query.toLowerCase())
      )
    : friends;

  const visibleFriends = filteredFriends.slice(0, visibleCount);

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

  // ── Invite ───────────────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<
    null | "sending" | "invited" | "already_invited" | "already_registered" | "error"
  >(null);
  const [invitations, setInvitations] = useState<InvitationEntry[]>([]);

  useEffect(() => {
    fetch("/api/invitations")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setInvitations(data); })
      .catch(() => {});
  }, []);

  async function sendInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviteStatus("sending");
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteStatus("error"); return; }
      if (data.status === "already_registered") { setInviteStatus("already_registered"); return; }
      if (data.status === "already_invited") { setInviteStatus("already_invited"); return; }
      setInviteStatus("invited");
      setInviteEmail("");
      setInvitations((prev) => [
        { id: data.id ?? String(Date.now()), inviteeEmail: email, usedCount: 0, expiresAt: data.expiresAt, createdAt: new Date().toISOString() },
        ...prev,
      ]);
    } catch {
      setInviteStatus("error");
    }
  }

  function inviteStatusMsg(): { text: string; color: string } | null {
    if (!inviteStatus || inviteStatus === "sending") return null;
    if (inviteStatus === "invited")              return { text: t.friends_inviteSent,              color: "#16a34a" };
    if (inviteStatus === "already_invited")      return { text: t.friends_inviteAlreadyInvited,    color: "#ea580c" };
    if (inviteStatus === "already_registered")   return { text: t.friends_inviteAlreadyRegistered, color: "#0369a1" };
    return { text: t.friends_inviteError, color: "#ef4444" };
  }

  function getInviteEntryStatus(inv: InvitationEntry): { label: string; color: string } {
    if (inv.usedCount > 0)                        return { label: t.friends_inviteStatusUsed,    color: "#16a34a" };
    if (new Date(inv.expiresAt) < new Date())     return { label: t.friends_inviteStatusExpired, color: "#9ca3af" };
    return { label: t.friends_inviteStatusPending, color: "#ea580c" };
  }

  // ── Persons (tagged people) ───────────────────────────────────────────────────
  const [persons, setPersons] = useState<PersonStub[]>([]);

  useEffect(() => {
    fetch("/api/persons")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPersons(data.filter((p: PersonStub) => !p.userId)); })
      .catch(() => {});
  }, []);

  // Reconcile modal
  type FriendStub = { id: string; name: string; username: string | null };
  const [reconcilingPerson, setReconcilingPerson] = useState<PersonStub | null>(null);
  const [reconcileFriends, setReconcileFriends] = useState<FriendStub[]>([]);
  const [loadingReconcileFriends, setLoadingReconcileFriends] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [reconcileSaving, setReconcileSaving] = useState(false);
  const [reconcileSearch, setReconcileSearch] = useState("");
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  async function openReconcile(person: PersonStub) {
    setReconcilingPerson(person);
    setSelectedFriendId(null);
    setReconcileSearch("");
    setReconcileError(null);
    setLoadingReconcileFriends(true);
    try {
      const res = await fetch("/api/friendships");
      const data = await res.json();
      setReconcileFriends((data.friends ?? []).map((f: { friend: FriendStub }) => f.friend));
    } finally {
      setLoadingReconcileFriends(false);
    }
  }

  async function handleReconcile() {
    if (!reconcilingPerson || !selectedFriendId) return;
    setReconcileSaving(true);
    setReconcileError(null);
    try {
      const res = await fetch(`/api/persons/${reconcilingPerson.id}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedFriendId }),
      });
      if (res.ok) {
        setPersons((prev) => prev.filter((p) => p.id !== reconcilingPerson.id));
        setReconcilingPerson(null);
      } else {
        const data = await res.json();
        const msg = data.error ?? "";
        if (msg === "Already reconciled") {
          setReconcileError("Este tag ya está vinculado a un usuario.");
        } else if (res.status === 403) {
          setReconcileError("Solo puedes vincular a amigos aceptados.");
        } else {
          setReconcileError("Error al vincular. Inténtalo de nuevo.");
        }
      }
    } catch {
      setReconcileError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setReconcileSaving(false);
    }
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
      {/* ── Add friends (invite + search grouped) ── */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid #f3f4f6" }}>
        <SectionHeader label={t.friends_addSection} />

        {/* Invite by email */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteStatus(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") sendInvite(); }}
            placeholder={t.friends_invitePlaceholder}
            style={{
              flex: 1, padding: "9px 12px",
              border: "1px solid #e5e7eb", borderRadius: 8,
              fontSize: 16, outline: "none", background: "#f9fafb",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#0369a1")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
          <Btn onClick={sendInvite} disabled={inviteStatus === "sending" || !inviteEmail.trim()}>
            {inviteStatus === "sending" ? t.friends_inviteSending : t.friends_inviteBtn}
          </Btn>
        </div>
        {inviteStatusMsg() && (
          <p style={{ fontSize: 12, color: inviteStatusMsg()!.color, margin: "0 0 8px" }}>
            {inviteStatusMsg()!.text}
          </p>
        )}
      </div>

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

      {/* ── Empty state (no friends, no requests, no pending tags) ── */}
      {friends.length === 0 && incoming.length === 0 && sent.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", border: "1px dashed #e5e7eb", borderRadius: 12 }}>
          <p style={{ fontSize: 32, margin: "0 0 8px" }}>🏔</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", margin: 0 }}>{t.friends_noFriends}</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0" }}>{t.friends_noFriendsSub}</p>
        </div>
      )}

      {/* ── Search (filters friend list) ── */}
      {friends.length > 0 && (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t.friends_searchPlaceholder}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "9px 14px 9px 38px",
              border: "1px solid #e5e7eb", borderRadius: 10,
              fontSize: 16, outline: "none", background: "#f9fafb",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#0369a1")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
          <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
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
      )}

      {/* ── Friends management (remove / block) ── */}
      {friends.length > 0 && (
        <div style={{ marginTop: incoming.length > 0 ? 8 : 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
            <SectionHeader label={`${t.friends_friendsSection} · ${friends.length}`} />
            {query.trim().length >= 2 && filteredFriends.length !== friends.length && (
              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                ({filteredFriends.length} resultado{filteredFriends.length !== 1 ? "s" : ""})
              </span>
            )}
          </div>
          {filteredFriends.length === 0 && query.trim().length >= 2 ? (
            <p style={{ fontSize: 13, color: "#9ca3af", padding: "12px 0" }}>{t.friends_noResults}</p>
          ) : (
            visibleFriends.map((f) => (
              <UserRow key={f.id}>
                <Avatar name={f.friend.name} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{f.friend.name}</p>
                  {f.friend.username && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>@{f.friend.username}</p>}
                </div>
                <div data-friend-menu style={{ position: "relative" }}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === f.id ? null : f.id)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb",
                      background: openMenuId === f.id ? "#f3f4f6" : "white",
                      cursor: "pointer", fontSize: 18, color: "#6b7280",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    ⋮
                  </button>
                  {openMenuId === f.id && (
                    <div style={{
                      position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20,
                      background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 160, overflow: "hidden",
                    }}>
                      <button
                        onClick={() => { remove(f.id, f.friend.id); setOpenMenuId(null); }}
                        style={{
                          display: "block", width: "100%", padding: "11px 16px",
                          textAlign: "left", border: "none", background: "white",
                          fontSize: 13, fontWeight: 600, color: "#ef4444", cursor: "pointer",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                      >
                        {t.friends_remove}
                      </button>
                      <button
                        onClick={() => { block(f); setOpenMenuId(null); }}
                        style={{
                          display: "block", width: "100%", padding: "11px 16px",
                          textAlign: "left", border: "none", background: "white",
                          fontSize: 13, fontWeight: 600, color: "#ea580c", cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ed")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                      >
                        {t.friends_block}
                      </button>
                    </div>
                  )}
                </div>
              </UserRow>
            ))
          )}
          {visibleCount < filteredFriends.length && (
            <button
              onClick={() => setVisibleCount((c) => c + 20)}
              style={{
                display: "block", width: "100%", marginTop: 8, padding: "10px 0",
                border: "1px solid #e5e7eb", borderRadius: 10,
                background: "white", fontSize: 13, fontWeight: 600,
                color: "#0369a1", cursor: "pointer",
              }}
            >
              Ver más ({filteredFriends.length - visibleCount} restantes)
            </button>
          )}
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

      {/* ── Reconcile modal ── */}
      {reconcilingPerson && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 18, padding: 28, width: "100%", maxWidth: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
              {t.people_reconcileTitle}
            </h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 18px" }}>&ldquo;{reconcilingPerson.name}&rdquo;</p>
            {loadingReconcileFriends ? (
              <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "16px 0" }}>…</p>
            ) : reconcileFriends.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "16px 0" }}>{t.people_reconcileNoFriends}</p>
            ) : (
              <>
              <input
                type="text"
                value={reconcileSearch}
                onChange={(e) => setReconcileSearch(e.target.value)}
                placeholder={t.friends_searchPlaceholder}
                style={{
                  width: "100%", boxSizing: "border-box", marginBottom: 10,
                  padding: "8px 12px", fontSize: 16,
                  border: "1px solid #e5e7eb", borderRadius: 8, outline: "none",
                  background: "#f9fafb",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20, maxHeight: 220, overflowY: "auto" }}>
                {reconcileFriends
                  .filter((f) => !reconcileSearch.trim() || f.name.toLowerCase().includes(reconcileSearch.toLowerCase()) || f.username?.toLowerCase().includes(reconcileSearch.toLowerCase()))
                  .map((f) => (
                  <button key={f.id} onClick={() => setSelectedFriendId(f.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    borderRadius: 10, border: "1.5px solid", cursor: "pointer", textAlign: "left",
                    borderColor: selectedFriendId === f.id ? "#0369a1" : "#e5e7eb",
                    background: selectedFriendId === f.id ? "#eff6ff" : "white",
                  }}>
                    <Avatar name={f.name} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{f.name}</p>
                      {f.username && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>@{f.username}</p>}
                    </div>
                    {selectedFriendId === f.id && <span style={{ marginLeft: "auto", color: "#0369a1", fontWeight: 700 }}>✓</span>}
                  </button>
                ))}
              </div>
              </>
            )}
            {reconcileError && (
              <p style={{ fontSize: 12, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", margin: "0 0 12px" }}>
                {reconcileError}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setReconcilingPerson(null)} disabled={reconcileSaving}
                style={{ padding: "9px 18px", background: "#f3f4f6", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                {t.cancel}
              </button>
              <button onClick={handleReconcile} disabled={!selectedFriendId || reconcileSaving}
                style={{ padding: "9px 18px", background: "#0369a1", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer", opacity: !selectedFriendId || reconcileSaving ? 0.5 : 1 }}>
                {reconcileSaving ? "…" : t.people_reconcileConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tagged persons ── */}
      {persons.length > 0 && (
        <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid #f3f4f6" }}>
          <SectionHeader label={t.friends_taggedSection} />
          {persons.map((p) => (
            <UserRow key={p.id}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: p.userId
                  ? "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)"
                  : "linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 700,
                color: p.userId ? "white" : "#9ca3af",
              }}>
                {p.name[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{p.name}</p>
                  {p.userId && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#0369a1", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "1px 6px", flexShrink: 0 }}>
                      ✓ {t.people_reconcileLinked}
                    </span>
                  )}
                </div>
                {p.email && <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>{p.email}</p>}
              </div>
              {!p.userId && (
                <Btn onClick={() => openReconcile(p)}>{t.people_reconcile}</Btn>
              )}
            </UserRow>
          ))}
        </div>
      )}

    </div>
  );
}
