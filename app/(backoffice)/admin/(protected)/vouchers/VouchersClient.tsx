"use client";

import { Fragment, useState } from "react";

type VoucherUse = {
  id: string;
  usedAt: Date | string;
  user: { id: string; name: string; email: string };
};

type Voucher = {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  note: string | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
  uses: VoucherUse[];
};

export function VouchersClient({ initialVouchers }: { initialVouchers: Voucher[] }) {
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Create form state ────────────────────────────────────────────────────
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxUses,
          note: note.trim() || undefined,
          expiresAt: expiresAt || undefined,
        }),
      });
      if (!res.ok) throw new Error("Error al crear el voucher");
      const created: Voucher = await res.json();
      setVouchers((prev) => [{ ...created, uses: [] }, ...prev]);
      setShowCreate(false);
      setMaxUses(1);
      setNote("");
      setExpiresAt("");
    } catch {
      setCreateError("No se pudo crear el voucher. Inténtalo de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/vouchers/${id}`, { method: "DELETE" });
      if (res.status === 409) {
        alert("No se puede eliminar un voucher que ya ha sido usado.");
        return;
      }
      if (!res.ok) throw new Error();
      setVouchers((prev) => prev.filter((v) => v.id !== id));
    } catch {
      alert("Error al eliminar el voucher.");
    } finally {
      setDeletingId(null);
    }
  }

  function copyCode(voucher: Voucher) {
    navigator.clipboard.writeText(voucher.code);
    setCopiedId(voucher.id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  function fmtDate(d: Date | string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-ES", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  const isExpired = (v: Voucher) =>
    v.expiresAt ? new Date(v.expiresAt) < new Date() : false;

  const isExhausted = (v: Voucher) => v.usedCount >= v.maxUses;

  function statusBadge(v: Voucher) {
    if (isExpired(v)) return <Badge color="#fee2e2" text="#b91c1c" label="Expirado" />;
    if (isExhausted(v)) return <Badge color="#f1f5f9" text="#64748b" label="Agotado" />;
    return <Badge color="#dcfce7" text="#15803d" label="Activo" />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Vouchers
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>
            {vouchers.length} voucher{vouchers.length !== 1 ? "s" : ""} ·{" "}
            {vouchers.filter((v) => !isExpired(v) && !isExhausted(v)).length} activo{vouchers.filter((v) => !isExpired(v) && !isExhausted(v)).length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: "#0f172a", color: "white", border: "none",
            borderRadius: 8, padding: "9px 18px", fontSize: 14,
            fontWeight: 600, cursor: "pointer", display: "flex",
            alignItems: "center", gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>+</span> Crear voucher
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {vouchers.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            No hay vouchers todavía. Crea el primero.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <Th>Código</Th>
                <Th>Nota</Th>
                <Th align="center">Usos</Th>
                <Th align="center">Estado</Th>
                <Th>Expira</Th>
                <Th>Creado</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v, i) => (
                <Fragment key={v.id}>
                  <tr
                    style={{ borderBottom: expandedId === v.id ? "none" : i < vouchers.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  >
                    {/* Code */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <code style={{
                          fontFamily: "monospace", fontSize: 13, fontWeight: 700,
                          color: "#1e293b", background: "#f8fafc",
                          border: "1px solid #e2e8f0", borderRadius: 6,
                          padding: "3px 8px", letterSpacing: "0.05em",
                        }}>
                          {v.code}
                        </code>
                        <button
                          onClick={() => copyCode(v)}
                          title="Copiar código"
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            fontSize: 14, padding: 2, opacity: 0.6,
                          }}
                        >
                          {copiedId === v.id ? "✓" : "⎘"}
                        </button>
                      </div>
                    </td>

                    {/* Note */}
                    <td style={tdStyle}>
                      <span style={{ fontSize: 13, color: "#64748b" }}>
                        {v.note ?? <span style={{ color: "#cbd5e1" }}>—</span>}
                      </span>
                    </td>

                    {/* Uses */}
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {v.usedCount > 0 ? (
                        <button
                          onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                          style={{
                            background: "#f1f5f9", border: "none", borderRadius: 6,
                            padding: "2px 10px", fontSize: 13, fontWeight: 600,
                            color: "#334155", cursor: "pointer",
                          }}
                        >
                          {v.usedCount}/{v.maxUses}
                        </button>
                      ) : (
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          0/{v.maxUses}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {statusBadge(v)}
                    </td>

                    {/* Expires */}
                    <td style={tdStyle}>
                      <span style={{ fontSize: 13, color: isExpired(v) ? "#b91c1c" : "#64748b" }}>
                        {fmtDate(v.expiresAt)}
                      </span>
                    </td>

                    {/* Created */}
                    <td style={tdStyle}>
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>
                        {fmtDate(v.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {v.usedCount === 0 && (
                        <button
                          onClick={() => handleDelete(v.id)}
                          disabled={deletingId === v.id}
                          style={{
                            background: "none", border: "1px solid #fecaca",
                            color: "#ef4444", borderRadius: 6, padding: "4px 10px",
                            fontSize: 12, cursor: "pointer", opacity: deletingId === v.id ? 0.5 : 1,
                          }}
                        >
                          {deletingId === v.id ? "..." : "Eliminar"}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded uses */}
                  {expandedId === v.id && (
                    <tr style={{ borderBottom: i < vouchers.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <td colSpan={7} style={{ padding: "0 16px 12px 16px", background: "#fafafa" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                          Usado por
                        </div>
                        {v.uses.map((u) => (
                          <div key={u.id} style={{ display: "flex", gap: 16, alignItems: "center", padding: "5px 0", borderTop: "1px solid #f1f5f9" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", minWidth: 140 }}>{u.user.name}</span>
                            <span style={{ fontSize: 13, color: "#64748b" }}>{u.user.email}</span>
                            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>{fmtDate(u.usedAt)}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div style={{
            background: "white", borderRadius: 16, padding: 28,
            width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 20px" }}>
              Crear voucher
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Max uses */}
              <label style={labelStyle}>
                Usos máximos
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  style={inputStyle}
                />
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  1 = código personal · más de 1 = código de grupo
                </span>
              </label>

              {/* Note */}
              <label style={labelStyle}>
                Nota <span style={{ color: "#94a3b8", fontWeight: 400 }}>(opcional)</span>
                <input
                  type="text"
                  placeholder="Ej: Club Pirineos, amigo de Pau..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  style={inputStyle}
                />
              </label>

              {/* Expires at */}
              <label style={labelStyle}>
                Fecha de expiración <span style={{ color: "#94a3b8", fontWeight: 400 }}>(opcional)</span>
                <input
                  type="date"
                  value={expiresAt ? expiresAt.split("T")[0] : ""}
                  onChange={(e) =>
                    setExpiresAt(e.target.value ? `${e.target.value}T23:59:59.000Z` : "")
                  }
                  style={inputStyle}
                />
              </label>
            </div>

            {createError && (
              <p style={{ fontSize: 13, color: "#ef4444", margin: "12px 0 0" }}>
                {createError}
              </p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowCreate(false); setCreateError(null); }}
                style={{
                  background: "none", border: "1px solid #e2e8f0",
                  borderRadius: 8, padding: "8px 18px",
                  fontSize: 14, color: "#64748b", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  background: "#0f172a", color: "white", border: "none",
                  borderRadius: 8, padding: "8px 18px",
                  fontSize: 14, fontWeight: 600, cursor: creating ? "not-allowed" : "pointer",
                  opacity: creating ? 0.7 : 1,
                }}
              >
                {creating ? "Creando..." : "Crear voucher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: "center" }) {
  return (
    <th style={{
      padding: "10px 16px", textAlign: align ?? "left",
      fontSize: 12, fontWeight: 600, color: "#64748b",
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {children}
    </th>
  );
}

function Badge({ color, text, label }: { color: string; text: string; label: string }) {
  return (
    <span style={{
      display: "inline-block", background: color, color: text,
      fontSize: 11, fontWeight: 700, padding: "2px 8px",
      borderRadius: 20,
    }}>
      {label}
    </span>
  );
}

const tdStyle: React.CSSProperties = { padding: "12px 16px", verticalAlign: "middle" };

const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 6,
  fontSize: 14, fontWeight: 600, color: "#374151",
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0", borderRadius: 8,
  padding: "8px 12px", fontSize: 14, color: "#0f172a",
  outline: "none", width: "100%", boxSizing: "border-box",
};
