import { prisma } from "@/lib/db/client";
import { UsersTable } from "./UsersTable";

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

  const rows = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt.toISOString(),
    ascents: u._count.ascents,
    photos: photoMap.get(u.id) ?? 0,
    friends: friendMap.get(u.id) ?? 0,
  }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Usuarios</h1>
        <p className="page-subtitle">
          {users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}
        </p>
      </div>
      <UsersTable users={rows} />
    </div>
  );
}
