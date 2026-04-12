import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      isAdmin: true,
      createdAt: true,
      memberships: { select: { tenantId: true }, take: 1 },
    },
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Usuarios
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>
          {users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div
        style={{
          background: "white", borderRadius: 12,
          border: "1px solid #e2e8f0", overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <Th>Nombre</Th>
              <Th>Email</Th>
              <Th>Usuario</Th>
              <Th>Registrado</Th>
              <Th>Rol</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={user.id}
                style={{
                  borderBottom: i < users.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: user.isAdmin ? "#1e293b" : "#e2e8f0",
                        color: user.isAdmin ? "white" : "#64748b",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500, color: "#0f172a", fontSize: 14 }}>
                      {user.name}
                    </span>
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 14, color: "#334155" }}>{user.email}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>
                    {user.username ? `@${user.username}` : "—"}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>
                    {new Date(user.createdAt).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </span>
                </td>
                <td style={tdStyle}>
                  {user.isAdmin ? (
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        background: "#1e293b", color: "white",
                        fontSize: 11, fontWeight: 700, padding: "2px 8px",
                        borderRadius: 20,
                      }}
                    >
                      Admin
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>Usuario</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "10px 16px", textAlign: "left",
        fontSize: 12, fontWeight: 600, color: "#64748b",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}
    >
      {children}
    </th>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  verticalAlign: "middle",
};
