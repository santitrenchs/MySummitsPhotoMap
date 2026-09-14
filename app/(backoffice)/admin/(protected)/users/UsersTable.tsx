"use client";

import { useState } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
  createdAt: string;
  ascents: number;
  /** null for bajas — the photos went with the cascade, nothing was snapshotted. */
  photos: number | null;
  friends: number | null;
  /** null = active account; a date = the account was deleted. */
  deletedAt: string | null;
  deletedReason: string | null;
};

type StatusFilter = "active" | "deleted" | "all";

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function UsersTable({
  users: initialUsers,
  deletedUsers,
}: {
  users: UserRow[];
  deletedUsers: UserRow[];
}) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [status, setStatus] = useState<StatusFilter>("active");
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const scoped =
    status === "active"  ? users :
    status === "deleted" ? deletedUsers :
    // "Todos": bajas mixed in by date, most recent event first.
    [...users, ...deletedUsers].sort((a, b) =>
      (b.deletedAt ?? b.createdAt).localeCompare(a.deletedAt ?? a.createdAt));

  const filtered = query.trim()
    ? scoped.filter(u => {
        const q = query.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.username ?? "").toLowerCase().includes(q)
        );
      })
    : scoped;

  const showStatusColumn = status !== "active";

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/users/${confirmDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Error al eliminar el usuario");
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch {
      setDeleteError("Error de red. Inténtalo de nuevo.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {([
            ["active",  `Activos (${users.length})`],
            ["deleted", `Bajas (${deletedUsers.length})`],
            ["all",     "Todos"],
          ] as Array<[StatusFilter, string]>).map(([value, label]) => (
            <button
              key={value}
              className="btn btn-sm"
              onClick={() => setStatus(value)}
              style={status === value
                ? { background: "var(--text-primary)", color: "white", border: "1px solid var(--text-primary)" }
                : { background: "none" }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="search-box">
          <svg className="search-box-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="form-input"
            type="text"
            placeholder="Buscar usuarios..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: "auto" }}>
          {filtered.length} usuario{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="table-container">
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Usuario</th>
                <th>Registrado</th>
                <th style={{ textAlign: "center" }}>Ascensiones</th>
                <th style={{ textAlign: "center" }}>Fotos</th>
                <th style={{ textAlign: "center" }}>Amigos</th>
                <th>Rol</th>
                {showStatusColumn && <th>Estado</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={showStatusColumn ? 10 : 9}>
                    <div className="empty-state">
                      {query.trim()
                        ? <>Sin resultados para &ldquo;{query}&rdquo;</>
                        : status === "deleted"
                          ? "Ninguna baja registrada"
                          : "Sin usuarios"}
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map(user => (
                <tr key={user.id} style={user.deletedAt ? { opacity: 0.62 } : undefined}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        className="avatar-circle"
                        style={{ background: user.isAdmin ? "var(--text-primary)" : undefined }}
                      >
                        <span style={{ color: user.isAdmin ? "white" : undefined, fontSize: 12, fontWeight: 700 }}>
                          {initials(user.name)}
                        </span>
                      </div>
                      <span style={{ fontWeight: 500 }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{user.email}</td>
                  <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {user.username ? `@${user.username}` : "—"}
                  </td>
                  <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {new Date(user.createdAt).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </td>
                  <td style={{ textAlign: "center" }}><StatNum value={user.ascents} /></td>
                  <td style={{ textAlign: "center" }}><StatNum value={user.photos} /></td>
                  <td style={{ textAlign: "center" }}><StatNum value={user.friends} /></td>
                  <td>
                    {user.isAdmin
                      ? <span className="badge badge-admin">Admin</span>
                      : <span className="badge badge-neutral">Usuario</span>
                    }
                  </td>
                  {showStatusColumn && (
                    <td style={{ fontSize: 13 }}>
                      {user.deletedAt ? (
                        <span
                          title={user.deletedReason === "admin"
                            ? "Eliminado desde el panel de admin"
                            : "Baja voluntaria desde Ajustes"}
                          style={{ color: "var(--color-red)", whiteSpace: "nowrap" }}
                        >
                          Baja ·{" "}
                          {new Date(user.deletedAt).toLocaleDateString("es-ES", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Activo</span>
                      )}
                    </td>
                  )}
                  <td>
                    {!user.isAdmin && !user.deletedAt && (
                      <button
                        className="btn btn-sm"
                        onClick={() => { setConfirmDelete(user); setDeleteError(null); }}
                        style={{ border: "1px solid var(--color-red-soft)", color: "var(--color-red)", background: "none" }}
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div
          className="modal-backdrop"
          onClick={e => { if (e.target === e.currentTarget && !deleting) setConfirmDelete(null); }}
        >
          <div className="modal-box">
            <h2 className="modal-title" style={{ color: "var(--color-red)" }}>
              Eliminar usuario
            </h2>
            <p className="modal-body">
              Vas a eliminar permanentemente la cuenta de{" "}
              <strong>{confirmDelete.name}</strong> ({confirmDelete.email}).
              {confirmDelete.ascents > 0 && (
                <> Esto borrará también sus <strong>{confirmDelete.ascents} ascensión{confirmDelete.ascents !== 1 ? "es" : ""}</strong> y todas las fotos asociadas.</>
              )}
              {" "}Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <p style={{ fontSize: 13, color: "var(--color-red)", margin: "0 0 16px", padding: "8px 12px", background: "var(--color-red-soft)", borderRadius: "var(--radius-sm)" }}>
                {deleteError}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Eliminando..." : "Sí, eliminar cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatNum({ value }: { value: number | null }) {
  if (!value) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  return <span style={{ fontWeight: 600 }}>{value}</span>;
}
