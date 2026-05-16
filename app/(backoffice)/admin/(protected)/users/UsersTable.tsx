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
  photos: number;
  friends: number;
};

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function UsersTable({ users }: { users: UserRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? users.filter(u => {
        const q = query.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.username ?? "").toLowerCase().includes(q)
        );
      })
    : users;

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
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
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">Sin resultados para &ldquo;{query}&rdquo;</div>
                  </td>
                </tr>
              )}
              {filtered.map(user => (
                <tr key={user.id}>
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
                  <td style={{ textAlign: "center" }}>
                    <StatNum value={user.ascents} />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <StatNum value={user.photos} />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <StatNum value={user.friends} />
                  </td>
                  <td>
                    {user.isAdmin
                      ? <span className="badge badge-admin">Admin</span>
                      : <span className="badge badge-neutral">Usuario</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatNum({ value }: { value: number }) {
  if (value === 0) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  return <span style={{ fontWeight: 600 }}>{value}</span>;
}
