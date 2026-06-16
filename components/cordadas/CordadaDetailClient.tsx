"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";
import { LEVEL_DEFS } from "@/lib/level-utils";
import type { CordadaDetail, CordadaMemberRanking } from "@/lib/services/cordada.service";

// ── Avatar ─────────────────────────────────────────────────────────────────────

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

function CordadaAvatar({ name, avatarUrl, size = 68 }: { name: string; avatarUrl?: string | null; size?: number }) {
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
      width: size, height: size, borderRadius: 16, flexShrink: 0,
      background: avatarUrl ? undefined : bg,
      overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color: "white",
    }}>
      {avatarUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initial}
    </div>
  );
}

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "16px 16px 8px",
      fontSize: 11, fontWeight: 700, color: "#9ca3af",
      letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
      {children}
    </div>
  );
}

// ── CairnIcon ──────────────────────────────────────────────────────────────────

function CairnIcon() {
  return (
    <svg width="11" height="10" viewBox="0 0 11 10" fill="none" style={{ flexShrink: 0 }}>
      <path d="M0.55 10 L10.45 10 L9.02 7.2 L1.98 7.2 Z" fill="#F59E0B" />
      <path d="M1.98 6.8 L9.02 6.8 L7.7 4 L3.3 4 Z" fill="#F59E0B" />
      <path d="M3.3 3.6 L7.7 3.6 L6.38 0.4 L4.62 0.4 Z" fill="#F59E0B" />
    </svg>
  );
}

// ── Rank badge ─────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, { bg: string; color: string }> = {
    1: { bg: "#FDE68A", color: "#D97706" },
    2: { bg: "#E5E7EB", color: "#6B7280" },
    3: { bg: "#F8D9B8", color: "#B45309" },
  };
  const c = colors[rank];
  return (
    <div style={{
      width: 30, height: 44, borderRadius: c ? 10 : 0,
      background: c ? c.bg : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 15, fontWeight: 700, color: c ? c.color : "#111827", flexShrink: 0,
    }}>
      {rank}
    </div>
  );
}

// ── Member row ─────────────────────────────────────────────────────────────────

function MemberRow({
  member,
  rank,
  isCurrentUser,
  canExpel,
  onExpel,
  expelling,
}: {
  member: CordadaMemberRanking;
  rank: number;
  isCurrentUser: boolean;
  canExpel: boolean;
  onExpel: () => void;
  expelling: boolean;
}) {
  const t = useT();
  const level = member.levelIdx >= 1 ? LEVEL_DEFS[member.levelIdx - 1] : null;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "8px 16px", gap: 10,
      background: isCurrentUser ? "#F0F9FF" : "white",
      position: "relative",
    }}>
      {/* Rank */}
      <div style={{ width: 30, display: "flex", justifyContent: "center", flexShrink: 0 }}>
        {member.isPending
          ? <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>—</span>
          : <RankBadge rank={rank} />}
      </div>

      {/* Avatar */}
      <Avatar name={member.name} avatarUrl={member.avatarUrl} size={52} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Line 1: name + "Tú" + badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 14, fontWeight: 700, color: "#111827",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {member.name}
          </span>
          {isCurrentUser && (
            <span style={{ fontSize: 12, color: "#6b7280" }}>Tú</span>
          )}
          {member.isPending && (
            <span style={{
              fontSize: 10, fontWeight: 500, background: "#f3f4f6", color: "#9ca3af",
              borderRadius: 20, padding: "1px 7px", whiteSpace: "nowrap",
            }}>
              Pendiente
            </span>
          )}
        </div>
        {/* Line 2: level · Fundador */}
        {!member.isPending && level && (
          <div style={{ display: "flex", alignItems: "center", marginTop: 1 }}>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
              {t[level.nameKey]}
            </span>
            {member.isOwner && (
              <>
                <span style={{ fontSize: 12, color: "#9ca3af", margin: "0 4px" }}>·</span>
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>
                  {t.cordadas_founder}
                </span>
              </>
            )}
          </div>
        )}
        {/* Line 3: N cimas · [cairn] N · N EP */}
        {!member.isPending && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
            <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{member.uniquePeaks}</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>cimas</span>
            <span style={{ fontSize: 12, color: "#9ca3af", margin: "0 2px" }}>·</span>
            <CairnIcon />
            <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 600 }}>{member.totalCairns}</span>
            <span style={{ fontSize: 12, color: "#9ca3af", margin: "0 2px" }}>·</span>
            <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{member.totalEp}</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>EP</span>
          </div>
        )}
      </div>

      {/* ⋮ menu — owner can expel, or user can leave */}
      {canExpel && !member.isOwner && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "4px 8px", color: "#9ca3af", fontSize: 18,
              borderRadius: 8,
            }}
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 40 }}
                onClick={() => setMenuOpen(false)}
              />
              <div style={{
                position: "absolute", right: 0, top: "100%", zIndex: 50,
                background: "white", borderRadius: 10, border: "1px solid #e5e7eb",
                boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                minWidth: 160, overflow: "hidden",
              }}>
                <button
                  onClick={() => { setMenuOpen(false); onExpel(); }}
                  disabled={expelling}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "11px 16px", width: "100%",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 500, color: "#ef4444",
                    textAlign: "left",
                  }}
                >
                  {isCurrentUser ? "Salir de la cordada" : "Expulsar"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function CordadaDetailClient({
  cordada,
  currentUserId,
}: {
  cordada: CordadaDetail;
  currentUserId: string;
}) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(cordada.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadAvatar(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/v1/cordadas/${cordada.id}/avatar`, { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.avatarUrl);
      }
    } catch {}
  }

  const isCurrentUserMember = cordada.members.some((m) => m.userId === currentUserId && !m.isPending);
  const currentMember = cordada.members.find((m) => m.userId === currentUserId);
  const amIOwner = cordada.isOwner;

  // Accepted members sorted by rank (already sorted from server)
  const acceptedMembers = cordada.members.filter((m) => !m.isPending);
  const pendingMembers = cordada.members.filter((m) => m.isPending);

  async function expelMember(targetUserId: string) {
    setActionLoading(`expel-${targetUserId}`);
    try {
      await fetch(`/api/v1/cordadas/${cordada.id}/members/${targetUserId}`, { method: "DELETE" });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  async function leaveCordada() {
    setActionLoading("leave");
    try {
      await fetch(`/api/v1/cordadas/${cordada.id}/members/${currentUserId}`, { method: "DELETE" });
      router.push("/cordadas");
    } finally {
      setActionLoading(null);
      setShowLeaveConfirm(false);
    }
  }

  async function deleteCordada() {
    setActionLoading("delete");
    try {
      await fetch(`/api/v1/cordadas/${cordada.id}`, { method: "DELETE" });
      router.push("/cordadas");
    } finally {
      setActionLoading(null);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 80 }}>

      {/* Hidden file input for avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
      />

      {/* ── Hero header ──────────────────────────── */}
      {avatarUrl ? (
        <div style={{ position: "relative", margin: "12px 0 0" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={cordada.name}
            style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
          }} />
          {/* ← Back button */}
          <Link
            href="/cordadas"
            style={{
              position: "absolute", top: 10, left: 10,
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", textDecoration: "none", fontSize: 18, lineHeight: 1,
            }}
          >←</Link>
          <div style={{ position: "absolute", bottom: 14, left: 16, right: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1.2 }}>
              {cordada.name}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {acceptedMembers.length} {acceptedMembers.length === 1 ? "miembro" : "miembros"}
            </div>
          </div>
          {amIOwner && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: "absolute", top: 10, right: 10,
                background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 8,
                padding: "5px 10px", cursor: "pointer",
                color: "white", fontSize: 12, fontWeight: 600,
              }}
            >
              {t.cordadas_changePhoto}
            </button>
          )}
        </div>
      ) : (
        <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            href="/cordadas"
            style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: "#f3f4f6", border: "1px solid #e5e7eb",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#374151", textDecoration: "none", fontSize: 18, lineHeight: 1,
            }}
          >←</Link>
          <div style={{ position: "relative" }}>
            <CordadaAvatar name={cordada.name} avatarUrl={null} size={68} />
            {amIOwner && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 24, height: 24, borderRadius: "50%",
                  background: "#2F7A5F", border: "2px solid white",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0D2538", lineHeight: 1.2 }}>
              {cordada.name}
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
              {acceptedMembers.length} {acceptedMembers.length === 1 ? "miembro" : "miembros"}
            </div>
          </div>
        </div>
      )}

      {/* ── Description ─────────────────────────── */}
      {cordada.description && (
        <div style={{ padding: "12px 16px 0" }}>
          <p style={{ fontSize: 14, color: "#374151", margin: 0, lineHeight: 1.6 }}>
            {cordada.description}
          </p>
        </div>
      )}

      {/* ── Member avatar stack + invite button + ⋮ menu ──── */}
      <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex" }}>
          {acceptedMembers.slice(0, 5).map((m, i) => (
            <div key={m.userId} style={{ marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i }}>
              <Avatar name={m.name} avatarUrl={m.avatarUrl} size={32} />
            </div>
          ))}
        </div>
        {amIOwner && (
          <Link
            href={`/cordadas/${cordada.id}/invite`}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              background: "#2F7A5F", color: "white",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Invitar
          </Link>
        )}
        {/* ⋮ owner menu — push to right */}
        {amIOwner && (
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <button
              onClick={() => setOwnerMenuOpen((o) => !o)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, color: "#6b7280",
              }}
            >
              ⋮
            </button>
            {ownerMenuOpen && (
              <>
                <div
                  onClick={() => setOwnerMenuOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                />
                <div style={{
                  position: "absolute", right: 0, top: "100%", zIndex: 50,
                  background: "white", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                  border: "1px solid #f3f4f6", minWidth: 180, overflow: "hidden",
                }}>
                  <button
                    onClick={() => { setOwnerMenuOpen(false); setShowDeleteConfirm(true); }}
                    style={{
                      width: "100%", padding: "12px 16px", background: "none", border: "none",
                      cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 500,
                      color: "#ef4444", display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                    Eliminar cordada
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: "#f3f4f6", margin: "16px 0 0" }} />

      {/* ── Ranking ──────────────────────────────── */}
      <SectionLabel>
        Ranking · {acceptedMembers.length} miembro{acceptedMembers.length !== 1 ? "s" : ""}
      </SectionLabel>
      <div style={{ background: "white" }}>
        {acceptedMembers.map((member, i) => (
          <div key={member.userId}>
            <MemberRow
              member={member}
              rank={i + 1}
              isCurrentUser={member.userId === currentUserId}
              canExpel={amIOwner || member.userId === currentUserId}
              onExpel={() => {
                if (member.userId === currentUserId) {
                  setShowLeaveConfirm(true);
                } else {
                  expelMember(member.userId);
                }
              }}
              expelling={actionLoading === `expel-${member.userId}`}
            />
            {i < acceptedMembers.length - 1 && (
              <div style={{ height: 1, background: "#f3f4f6", marginLeft: 88 }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Pending invites (owner only) ─────────── */}
      {pendingMembers.length > 0 && amIOwner && (
        <>
          <SectionLabel>
            Invitaciones pendientes · {pendingMembers.length}
          </SectionLabel>
          <div style={{ background: "white" }}>
            {pendingMembers.map((member, i) => (
              <div key={member.userId}>
                <MemberRow
                  member={member}
                  rank={acceptedMembers.length + i + 1}
                  isCurrentUser={false}
                  canExpel={true}
                  onExpel={() => expelMember(member.userId)}
                  expelling={actionLoading === `expel-${member.userId}`}
                />
                {i < pendingMembers.length - 1 && (
                  <div style={{ height: 1, background: "#f3f4f6", marginLeft: 88 }} />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Leave action (members only, not owner) ── */}
      {!amIOwner && isCurrentUserMember && (
        <div style={{ padding: "24px 16px 0" }}>
          <button
            onClick={() => setShowLeaveConfirm(true)}
            style={{
              width: "100%", padding: "12px", borderRadius: 10,
              background: "none", border: "1px solid #e5e7eb", cursor: "pointer",
              fontSize: 14, fontWeight: 600, color: "#6b7280",
            }}
          >
            Salir de la cordada
          </button>
        </div>
      )}

      {/* ── Delete confirm sheet ─────────────────── */}
      {showDeleteConfirm && (
        <ConfirmSheet
          title="¿Eliminar cordada?"
          body={`Esto eliminará la cordada "${cordada.name}" y expulsará a todos sus miembros. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          confirmDanger
          loading={actionLoading === "delete"}
          onConfirm={deleteCordada}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* ── Leave confirm sheet ──────────────────── */}
      {showLeaveConfirm && (
        <ConfirmSheet
          title="¿Salir de la cordada?"
          body={`Saldrás de "${cordada.name}". Puedes ser invitado de nuevo más adelante.`}
          confirmLabel="Salir"
          confirmDanger
          loading={actionLoading === "leave"}
          onConfirm={leaveCordada}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}
    </div>
  );
}

// ── Confirm bottom sheet ───────────────────────────────────────────────────────

function ConfirmSheet({
  title,
  body,
  confirmLabel,
  confirmDanger = false,
  loading,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  confirmDanger?: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }}
        onClick={onCancel}
      />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
        background: "white", borderRadius: "16px 16px 0 0",
        padding: "24px 20px",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        maxWidth: 640, margin: "0 auto",
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 2, background: "#e5e7eb",
          margin: "0 auto 20px",
        }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0D2538", marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>
          {body}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "12px", borderRadius: 10,
              background: "#f3f4f6", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 600, color: "#374151",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: "12px", borderRadius: 10, border: "none", cursor: "pointer",
              background: confirmDanger ? "#ef4444" : "#2F7A5F",
              color: "white", fontSize: 14, fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
