import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, ascentPhotos, friendships] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        isAdmin: true,
        createdAt: true,
        memberships: { select: { tenantId: true }, take: 1 },
        _count: { select: { ascents: true } },
      },
    }),
    prisma.ascent.findMany({
      select: { createdBy: true, _count: { select: { photos: true } } },
    }),
    prisma.friendship.findMany({
      where: { status: "ACCEPTED" },
      select: { requesterId: true, addresseeId: true },
    }),
  ]);

  const photoMap = new Map<string, number>();
  for (const a of ascentPhotos) {
    photoMap.set(a.createdBy, (photoMap.get(a.createdBy) ?? 0) + a._count.photos);
  }

  const friendMap = new Map<string, number>();
  for (const f of friendships) {
    friendMap.set(f.requesterId, (friendMap.get(f.requesterId) ?? 0) + 1);
    friendMap.set(f.addresseeId, (friendMap.get(f.addresseeId) ?? 0) + 1);
  }

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
              <Th align="center">Ascensiones</Th>
              <Th align="center">Fotos</Th>
              <Th align="center">Amigos</Th>
              <Th>Rol</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => {
              const ascents = user._count.ascents;
              const photos = photoMap.get(user.id) ?? 0;
              const friends = friendMap.get(user.id) ?? 0;
              return (
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
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <StatBadge value={ascents} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <StatBadge value={photos} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <StatBadge value={friends} />
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "center" }) {
  return (
    <th
      style={{
        padding: "10px 16px", textAlign: align ?? "left",
        fontSize: 12, fontWeight: 600, color: "#64748b",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}
    >
      {children}
    </th>
  );
}

function StatBadge({ value }: { value: number }) {
  if (value === 0) return <span style={{ fontSize: 13, color: "#cbd5e1" }}>—</span>;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 13, fontWeight: 600, color: "#334155",
        background: "#f1f5f9", borderRadius: 6,
        padding: "2px 8px", minWidth: 28, textAlign: "center",
      }}
    >
      {value}
    </span>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  verticalAlign: "middle",
};
