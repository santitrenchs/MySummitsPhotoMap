"use client";

import { useState, useTransition } from "react";
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

// ── Rank medal ─────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  if (medals[rank]) {
    return <span style={{ fontSize: 18 }}>{medals[rank]}</span>;
  }
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      background: "#f3f4f6",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, color: "#9ca3af", flexShrink: 0,
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
      display: "flex", alignItems: "center", padding: "12px 16px", gap: 12,
      background: isCurrentUser ? "#f0fdf4" : "white",
      position: "relative",
    }}>
      {/* Rank */}
      <div style={{ width: 28, display: "flex", justifyContent: "center", flexShrink: 0 }}>
        {member.isPending
          ? <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>—</span>
          : <RankBadge rank={rank} />}
      </div>

      {/* Avatar */}
      <Avatar name={member.name} avatarUrl={member.avatarUrl} size={42} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 15, fontWeight: 600, color: "#111827",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {member.name}
          </span>
          {isCurrentUser && (
            <span style={{
              fontSize: 10, fontWeight: 600, background: "#eff6ff", color: "#0369a1",
              borderRadius: 20, padding: "1px 7px", whiteSpace: "nowrap",
            }}>
              Tú
            </span>
          )}
          {member.isOwner && (
            <span style={{
              fontSize: 10, fontWeight: 600, background: "#fef9c3", color: "#854d0e",
              borderRadius: 20, padding: "1px 7px", whiteSpace: "nowrap",
            }}>
              Admin
            </span>
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
        {!member.isPending && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            {level && (
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                {level.emoji} {t[level.nameKey]}
              </span>
            )}
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              {member.uniquePeaks} cimas · {member.totalEp} EP
            </span>
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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

      {/* ── Back nav ─────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px 0",
      }}>
        <Link href="/cordadas" style={{
          display: "flex", alignItems: "center", gap: 6,
          color: "#0369a1", textDecoration: "none", fontSize: 14, fontWeight: 500,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Cordadas
        </Link>
      </div>

      {/* ── Hero header ──────────────────────────── */}
      {cordada.avatarUrl ? (
        <div style={{ position: "relative", margin: "12px 0 0" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cordada.avatarUrl}
            alt={cordada.name}
            style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
          }} />
          <div style={{ position: "absolute", bottom: 14, left: 16, right: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1.2 }}>
              {cordada.name}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {acceptedMembers.length} {acceptedMembers.length === 1 ? "miembro" : "miembros"}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 14 }}>
          <CordadaAvatar name={cordada.name} avatarUrl={null} size={68} />
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

      {/* ── Member avatar stack + invite button ──── */}
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

      {/* ── Danger actions ───────────────────────── */}
      <div style={{ padding: "24px 16px 0" }}>
        {amIOwner ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: "100%", padding: "12px", borderRadius: 10,
              background: "none", border: "1px solid #fee2e2", cursor: "pointer",
              fontSize: 14, fontWeight: 600, color: "#ef4444",
            }}
          >
            Eliminar cordada
          </button>
        ) : isCurrentUserMember ? (
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
        ) : null}
      </div>

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
