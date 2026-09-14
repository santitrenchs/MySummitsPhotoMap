import { prisma } from "@/lib/db/client";
import { UsersTable } from "./UsersTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, ascentPhotos, friendships, deleted] = await Promise.all([
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
    // Accounts that no longer exist — the User row is hard-deleted, this log is
    // the only trace left. See `DeletedUserLog` in schema.prisma.
    prisma.deletedUserLog.findMany({
      orderBy: { deletedAt: "desc" },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        username: true,
        reason: true,
        signupAt: true,
        totalAscents: true,
        deletedAt: true,
      },
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

  const activeRows = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt.toISOString(),
    ascents: u._count.ascents,
    photos: photoMap.get(u.id) ?? 0,
    friends: friendMap.get(u.id) ?? 0,
    deletedAt: null,
    deletedReason: null,
  }));

  // Photos and friends are gone with the cascade — only the ascent count was
  // snapshotted at deletion time, so those two columns read "—" for bajas.
  const deletedRows = deleted.map(d => ({
    id: `deleted-${d.id}`,
    name: d.name,
    email: d.email,
    username: d.username,
    isAdmin: false,
    createdAt: (d.signupAt ?? d.deletedAt).toISOString(),
    ascents: d.totalAscents,
    photos: null,
    friends: null,
    deletedAt: d.deletedAt.toISOString(),
    deletedReason: d.reason,
  }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Usuarios</h1>
        <p className="page-subtitle">
          {activeRows.length} activo{activeRows.length !== 1 ? "s" : ""}
          {deletedRows.length > 0 && ` · ${deletedRows.length} baja${deletedRows.length !== 1 ? "s" : ""}`}
        </p>
      </div>
      <UsersTable users={activeRows} deletedUsers={deletedRows} />
    </div>
  );
}
