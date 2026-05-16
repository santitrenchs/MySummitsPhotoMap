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
        body: JSON.stringify({ maxUses, note: note.trim() || undefined, expiresAt: expiresAt || undefined }),
      });
      if (!res.ok) throw new Error();
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
      if (res.status === 409) { alert("No se puede eliminar un voucher que ya ha sido usado."); return; }
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
    return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  }

  const isExpired = (v: Voucher) => v.expiresAt ? new Date(v.expiresAt) < new Date() : false;
  const isExhausted = (v: Voucher) => v.usedCount >= v.maxUses;
  const activeCount = vouchers.filter(v => !isExpired(v) && !isExhausted(v)).length;

  function statusBadge(v: Voucher) {
    if (isExpired(v))   return <span className="badge badge-danger">Expirado</span>;
    if (isExhausted(v)) return <span className="badge badge-neutral">Agotado</span>;
    return <span className="badge badge-success">Activo</span>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Vouchers</h1>
          <p className="page-subtitle">
            {vouchers.length} voucher{vouchers.length !== 1 ? "s" : ""} · {activeCount} activo{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Crear voucher
        </button>
      </div>

      <div className="table-container">
        {vouchers.length === 0 ? (
          <div className="empty-state">No hay vouchers todavía. Crea el primero.</div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nota</th>
                  <th style={{ textAlign: "center" }}>Usos</th>
                  <th style={{ textAlign: "center" }}>Estado</th>
                  <th>Expira</th>
                  <th>Creado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <Fragment key={v.id}>
                    <tr>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <code style={{
                            fontFamily: "monospace", fontSize: 13, fontWeight: 700,
                            color: "var(--text-primary)", background: "var(--bg-secondary)",
                            border: "1px solid var(--border)", borderRadius: 6,
                            padding: "3px 8px", letterSpacing: "0.05em",
                          }}>
                            {v.code}
                          </code>
                          <button
                            onClick={() => copyCode(v)}
                            title="Copiar código"
                            className="action-btn"
                            style={{ fontSize: 14 }}
                          >
                            {copiedId === v.id ? "✓" : "⎘"}
                          </button>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {v.note ?? <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {v.usedCount > 0 ? (
                          <button
                            className="badge badge-info"
                            onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                            style={{ cursor: "pointer", border: "none" }}
                          >
                            {v.usedCount}/{v.maxUses}
                          </button>
                        ) : (
                          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>0/{v.maxUses}</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>{statusBadge(v)}</td>
                      <td style={{ fontSize: 13, color: isExpired(v) ? "var(--color-red)" : "var(--text-secondary)" }}>
                        {fmtDate(v.expiresAt)}
                      </td>
                      <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{fmtDate(v.createdAt)}</td>
                      <td>
                        {v.usedCount === 0 && (
                          <button
                            className="btn btn-sm"
                            onClick={() => handleDelete(v.id)}
                            disabled={deletingId === v.id}
                            style={{ border: "1px solid var(--color-red-soft)", color: "var(--color-red)", background: "none" }}
                          >
                            {deletingId === v.id ? "..." : "Eliminar"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === v.id && (
                      <tr>
                        <td colSpan={7} style={{ padding: "0 16px 12px", background: "var(--bg-secondary)" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, marginTop: 10 }}>
                            Usado por
                          </div>
                          {v.uses.map((u) => (
                            <div key={u.id} style={{ display: "flex", gap: 16, alignItems: "center", padding: "5px 0", borderTop: "1px solid var(--border-subtle)" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", minWidth: 140 }}>{u.user.name}</span>
                              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{u.user.email}</span>
                              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{fmtDate(u.usedAt)}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div className="modal-box">
            <h2 className="modal-title">Crear voucher</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Usos máximos</label>
                <input
                  type="number" min={1} max={100}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  className="form-input"
                />
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                  1 = código personal · más de 1 = código de grupo
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Nota <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Club Pirineos, amigo de Pau..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Fecha de expiración <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="date"
                  value={expiresAt ? expiresAt.split("T")[0] : ""}
                  onChange={(e) => setExpiresAt(e.target.value ? `${e.target.value}T23:59:59.000Z` : "")}
                  className="form-input"
                />
              </div>
            </div>
            {createError && (
              <p style={{ fontSize: 13, color: "var(--color-red)", margin: "12px 0 0" }}>{createError}</p>
            )}
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => { setShowCreate(false); setCreateError(null); }}
              >Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={creating}
              >{creating ? "Creando..." : "Crear voucher"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
