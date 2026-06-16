"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
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

  // Choice modal (amigo / cordada) + add-friend modal + create-cordada modal state
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [createCordadaOpen, setCreateCordadaOpen] = useState(false);
  const [cordadaName, setCordadaName] = useState("");
  const [cordadaDescription, setCordadaDescription] = useState("");
  const [cordadaPhotoFile, setCordadaPhotoFile] = useState<File | null>(null);
  const [cordadaPhotoPreview, setCordadaPhotoPreview] = useState<string | null>(null);
  const [cordadaLoading, setCordadaLoading] = useState(false);
  const [cordadaError, setCordadaError] = useState<string | null>(null);
  const cordadaFileInputRef = useRef<HTMLInputElement>(null);
  const [addQuery, setAddQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const existingFriendIds = new Set(friends.map((f) => f.friend.id));
  const sentRequestIds = new Set(sentRequests.map((r) => r.userId));

  // Focus the add-modal input when it opens
  useEffect(() => {
    if (addModalOpen) {
      setTimeout(() => addInputRef.current?.focus(), 50);
    } else {
      setAddQuery("");
      setSearchResults([]);
    }
  }, [addModalOpen]);

  // Debounced search inside the add-friend modal
  useEffect(() => {
    const q = addQuery.trim();
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
  }, [addQuery]);

  async function sendFriendRequest(targetId: string) {
    setActionLoading(`add-${targetId}`);
    try {
      await fetch("/api/friendships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: targetId }),
      });
      setSentIds((prev) => new Set([...prev, targetId]));
    } finally {
      setActionLoading(null);
    }
  }

  function handleCordadaFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCordadaPhotoFile(file);
    setCordadaPhotoPreview(URL.createObjectURL(file));
  }

  function closeCordadaModal() {
    setCreateCordadaOpen(false);
    setCordadaName("");
    setCordadaDescription("");
    setCordadaPhotoFile(null);
    setCordadaPhotoPreview(null);
    setCordadaError(null);
  }

  const handleCreateCordada = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = cordadaName.trim();
    if (!trimmed) return;
    setCordadaLoading(true);
    setCordadaError(null);
    try {
      const res = await fetch("/api/v1/cordadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, description: cordadaDescription.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Error al crear la cordada");
      }
      const { cordada } = await res.json();
      if (cordadaPhotoFile) {
        const fd = new FormData();
        fd.append("file", cordadaPhotoFile);
        await fetch(`/api/v1/cordadas/${cordada.id}/avatar`, { method: "POST", body: fd }).catch(() => {});
      }
      closeCordadaModal();
      router.push(`/cordadas/${cordada.id}`);
    } catch (err) {
      setCordadaError(err instanceof Error ? err.message : "Error inesperado");
      setCordadaLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cordadaName, cordadaDescription, cordadaPhotoFile]);

  // Total pending = friend requests + cordada invites
  const totalPending = incomingRequests.length + cordadaInvites.length;

  // Filter combined list by search query (local only)
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

  async function removeFriend(friendshipId: string) {
    await fetch(`/api/friendships/${friendshipId}`, { method: "DELETE" });
    startTransition(() => router.refresh());
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
      <style>{`
        @media (min-width: 640px) {
          .cordadas-sheet-panel { margin-left: 68px; }
        }
      `}</style>

      {/* ── Header: filter search + Añadir button ──── */}
      <div style={{
        padding: "12px 16px 8px",
        position: "sticky", top: "var(--top-nav-h, 52px)", zIndex: 20, background: "white",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
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
        <button
          onClick={() => setChoiceModalOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "0 14px", height: 44, borderRadius: 12, border: "none",
            background: "#2F7A5F", color: "white",
            fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t.friends_add}
        </button>
      </div>

      {/* ── Choice modal (amigo / cordada) ───────── */}
      {choiceModalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setChoiceModalOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div className="cordadas-sheet-panel" style={{
            width: "100%", maxWidth: 640, background: "white",
            borderRadius: "16px 16px 0 0", padding: "20px 16px",
            paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Añadir</span>
              <button
                onClick={() => setChoiceModalOpen(false)}
                style={{
                  background: "#f3f4f6", border: "none", borderRadius: "50%",
                  width: 32, height: 32, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Amigo */}
              <button
                onClick={() => { setChoiceModalOpen(false); setAddModalOpen(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 14, border: "1.5px solid #e5e7eb",
                  background: "white", cursor: "pointer", textAlign: "left", width: "100%",
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: "#eff6ff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="9" cy="7" r="3" />
                    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                    <path d="M19 8v6M22 11h-6" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{t.friends_add}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>Busca por nombre o usuario</div>
                </div>
              </button>
              {/* Cordada */}
              <button
                onClick={() => { setChoiceModalOpen(false); setCreateCordadaOpen(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 14, border: "1.5px solid #e5e7eb",
                  background: "white", cursor: "pointer", textAlign: "left", width: "100%",
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: "#f0fdf4",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F7A5F" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="9" cy="7" r="3" />
                    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                    <circle cx="17" cy="7" r="3" />
                    <path d="M21 21v-2a4 4 0 0 0-4-4h-1" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{t.cordadas_createBtn}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>Crea un grupo de escalada</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add-friend modal ──────────────────────── */}
      {addModalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setAddModalOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div className="cordadas-sheet-panel" style={{
            width: "100%", maxWidth: 640, background: "white",
            borderRadius: "16px 16px 0 0",
            maxHeight: "80vh", display: "flex", flexDirection: "column",
          }}>
            {/* Modal header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 16px 0",
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                {t.friends_addSection}
              </span>
              <button
                onClick={() => setAddModalOpen(false)}
                style={{
                  background: "#f3f4f6", border: "none", borderRadius: "50%",
                  width: 32, height: 32, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>
            {/* Search input */}
            <div style={{ padding: "12px 16px" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#f3f4f6", borderRadius: 12, padding: "0 12px", height: 44,
              }}>
                <SearchIcon />
                <input
                  ref={addInputRef}
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  placeholder={t.friends_searchPlaceholder}
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    fontSize: 16, color: "#111827",
                  }}
                />
                {addQuery && (
                  <button
                    onClick={() => setAddQuery("")}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#9ca3af" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {/* Results */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {addQuery.trim().length < 2 && (
                <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
                  Escribe al menos 2 caracteres para buscar
                </div>
              )}
              {addQuery.trim().length >= 2 && searchLoading && (
                <div style={{ padding: "16px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>…</div>
              )}
              {addQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && (
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
            {/* Safe area bottom */}
            <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
          </div>
        </div>
      )}

      {/* ── Create-cordada modal (floating, same pattern as AscentModal) ──────── */}
      {createCordadaOpen && (
        <>
          <style>{`
            .create-cordada-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.65);
              z-index: 500;
              display: flex;
              align-items: center;
              justify-content: center;
              animation: ccFadeIn 0.2s ease;
            }
            @keyframes ccFadeIn { from { opacity: 0; } to { opacity: 1; } }
            .create-cordada-container {
              position: relative;
              background: white;
              border-radius: 12px;
              width: min(520px, 92vw);
              max-height: min(700px, 92svh);
              display: flex;
              flex-direction: column;
              overflow: hidden;
              animation: ccSlideIn 0.22s cubic-bezier(0.32, 0.72, 0, 1);
            }
            @keyframes ccSlideIn {
              from { opacity: 0; transform: scale(0.96) translateY(8px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
            @media (max-width: 639px) {
              .create-cordada-backdrop { align-items: flex-end; }
              .create-cordada-container {
                width: 100%;
                max-height: 92svh;
                border-radius: 16px 16px 0 0;
                padding-bottom: env(safe-area-inset-bottom);
                animation: ccSlideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1);
              }
              @keyframes ccSlideUp {
                from { transform: translateY(100%); }
                to   { transform: translateY(0); }
              }
            }
          `}</style>
          <div className="create-cordada-backdrop" onClick={closeCordadaModal}>
            <div className="create-cordada-container" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", height: 52, flexShrink: 0,
                borderBottom: "1px solid #e5e7eb", padding: "0 16px",
              }}>
                <button
                  onClick={closeCordadaModal}
                  style={{
                    position: "absolute", left: 12,
                    background: "none", border: "none", cursor: "pointer",
                    padding: 4, color: "#111827", display: "flex", alignItems: "center",
                    borderRadius: 6,
                  }}
                  aria-label="Cerrar"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  {t.cordadas_createTitle}
                </span>
              </div>

              {/* Scrollable form */}
              <form onSubmit={handleCreateCordada} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div style={{ overflowY: "auto", flex: 1, padding: "20px 20px 0" }}>
                {/* Cover photo */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    {t.cordadas_photoLabel} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({t.optional})</span>
                  </div>
                  <div
                    onClick={() => cordadaFileInputRef.current?.click()}
                    style={{
                      width: "100%", aspectRatio: "3/2", borderRadius: 12, cursor: "pointer",
                      border: cordadaPhotoPreview ? "none" : "2px dashed #d1d5db",
                      background: cordadaPhotoPreview ? "none" : "#f9fafb",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden", position: "relative",
                    }}
                  >
                    {cordadaPhotoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cordadaPhotoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ textAlign: "center", color: "#9ca3af" }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 8px", display: "block" }}>
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <div style={{ fontSize: 13 }}>Añadir foto</div>
                      </div>
                    )}
                    {cordadaPhotoPreview && (
                      <div style={{
                        position: "absolute", bottom: 8, right: 8,
                        background: "rgba(0,0,0,0.55)", borderRadius: 8, padding: "4px 10px",
                        color: "white", fontSize: 12, fontWeight: 600,
                      }}>
                        {t.cordadas_changePhoto}
                      </div>
                    )}
                  </div>
                  <input
                    ref={cordadaFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCordadaFileChange}
                    style={{ display: "none" }}
                  />
                </div>

                {/* Name */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    {t.cordadas_nameLabel} *
                  </label>
                  <input
                    value={cordadaName}
                    onChange={(e) => setCordadaName(e.target.value)}
                    maxLength={60}
                    placeholder={t.cordadas_namePlaceholder}
                    required
                    style={{
                      width: "100%", boxSizing: "border-box",
                      border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 12px",
                      fontSize: 15, color: "#111827", outline: "none", fontFamily: "inherit",
                    }}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    {t.cordadas_descriptionLabel} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({t.optional})</span>
                  </label>
                  <textarea
                    value={cordadaDescription}
                    onChange={(e) => setCordadaDescription(e.target.value)}
                    maxLength={200}
                    rows={3}
                    placeholder={t.cordadas_descriptionPlaceholder}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 12px",
                      fontSize: 15, color: "#111827", outline: "none", resize: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                {cordadaError && (
                  <div style={{
                    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
                    padding: "10px 12px", marginBottom: 14, fontSize: 13, color: "#dc2626",
                  }}>
                    {cordadaError}
                  </div>
                )}
                </div>

                {/* Sticky footer — always visible */}
                <div style={{
                  padding: "12px 20px 20px", borderTop: "1px solid #f3f4f6", flexShrink: 0,
                }}>
                  <button
                    type="submit"
                    disabled={cordadaLoading || !cordadaName.trim()}
                    style={{
                      width: "100%", height: 50, borderRadius: 12, border: "none",
                      background: cordadaLoading || !cordadaName.trim() ? "#9ca3af" : "#2F7A5F",
                      color: "white", fontSize: 15, fontWeight: 700,
                      cursor: cordadaLoading || !cordadaName.trim() ? "default" : "pointer",
                    }}
                  >
                    {cordadaLoading ? t.cordadas_creating : t.cordadas_createBtn}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

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
                  ? <FriendRow entry={item.data} onRemove={() => removeFriend(item.data.id)} />
                  : <CordadaRow cordada={item.data} />
                }
                {i < combined.length - 1 && <InsetRule />}
              </div>
            ))}
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
          <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginTop: 2 }}>
            {t.friends_noFriends}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", maxWidth: 260, lineHeight: 1.5 }}>
            {t.friends_noFriendsSub}
          </div>
          <button
            onClick={() => setChoiceModalOpen(true)}
            style={{
              marginTop: 8,
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 20px", borderRadius: 10, border: "none",
              background: "#2F7A5F", color: "white",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Añadir
          </button>
        </div>
      )}

      {q && combined.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px", fontSize: 14, color: "#9ca3af" }}>
          {t.friends_noResults}
        </div>
      )}

    </div>
  );
}

// ── FriendRow ──────────────────────────────────────────────────────────────────

function FriendRow({ entry, onRemove }: { entry: FriendEntry; onRemove: () => void }) {
  const t = useT();
  const { friend } = entry;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const level = friend.levelIdx >= 1 ? LEVEL_DEFS[friend.levelIdx - 1] : null;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <>
      {/* Confirm remove dialog */}
      {confirmOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 24px",
          }}
        >
          <div style={{
            background: "white", borderRadius: 16, padding: "24px 20px",
            width: "100%", maxWidth: 320, textAlign: "center",
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
              {t.friends_remove}
            </div>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 20, lineHeight: 1.5 }}>
              ¿Eliminar a {friend.name} de tus amigos?
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmOpen(false)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e5e7eb",
                  background: "white", fontSize: 14, fontWeight: 600, color: "#6b7280", cursor: "pointer",
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={() => { setConfirmOpen(false); onRemove(); }}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                  background: "#fef2f2", fontSize: 14, fontWeight: 600, color: "#ef4444", cursor: "pointer",
                }}
              >
                {t.friends_remove}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", gap: 12 }}>
        <Avatar name={friend.name ?? "?"} avatarUrl={friend.avatarUrl} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: "#111827",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {friend.name}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 0,
            marginTop: 2, fontSize: 12, flexWrap: "wrap",
          }}>
            {level && (
              <span style={{ color: "#6b7280", fontWeight: 500 }}>{t[level.nameKey]}</span>
            )}
            <span style={{ color: "#d1d5db", margin: "0 5px" }}>·</span>
            <span style={{ color: "#374151", fontWeight: 600 }}>{friend.uniquePeaks}</span>
            <span style={{ color: "#6b7280" }}>&nbsp;cimas</span>
            <span style={{ color: "#d1d5db", margin: "0 5px" }}>·</span>
            <CairnIcon />
            <span style={{ color: "#f59e0b", fontWeight: 600, marginLeft: 3 }}>{friend.totalCairns}</span>
            <span style={{ color: "#d1d5db", margin: "0 5px" }}>·</span>
            <span style={{ color: "#374151", fontWeight: 600 }}>{friend.totalEp}</span>
            <span style={{ color: "#6b7280" }}>&nbsp;EP</span>
          </div>
        </div>
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              width: 40, height: 40, borderRadius: 8, border: "none",
              background: menuOpen ? "#f3f4f6" : "transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "#9ca3af", fontSize: 20,
            }}
          >
            ⋮
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20,
              background: "white", border: "1px solid #e5e7eb", borderRadius: 12,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 160, overflow: "hidden",
            }}>
              <button
                onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
                style={{
                  display: "block", width: "100%", padding: "12px 16px",
                  textAlign: "left", border: "none", background: "white",
                  fontSize: 13, fontWeight: 600, color: "#ef4444", cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
              >
                {t.friends_remove}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CairnIcon() {
  return (
    <svg width="11" height="10" viewBox="0 0 11 10" fill="none" style={{ flexShrink: 0 }}>
      <path d="M0.55 10 L10.45 10 L9.02 7.2 L1.98 7.2 Z" fill="#F59E0B" />
      <path d="M1.98 6.8 L9.02 6.8 L7.7 4 L3.3 4 Z" fill="#F59E0B" />
      <path d="M3.3 3.6 L7.7 3.6 L6.38 0.4 L4.62 0.4 Z" fill="#F59E0B" />
    </svg>
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
