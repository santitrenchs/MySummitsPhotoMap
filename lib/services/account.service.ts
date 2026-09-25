import { prisma } from "@/lib/db/client";
import { notifyUserDeleted } from "@/lib/email";

/**
 * Permanently deletes a user's account and everything that belongs to it.
 *
 * Lives in a service, not in a route handler, because two clients need it: the web
 * settings page and the mobile `DELETE /api/v1/settings/account`. Google Play has
 * required an in-app deletion path since 2023 for any app that lets you create an
 * account, so this is not optional on Android.
 *
 * Returns false when the user no longer exists — the caller answers 401, so a
 * stale session cannot be told whether the account was ever there.
 */
export async function deleteAccount(userId: string, tenantId?: string | null): Promise<boolean> {
  // Snapshot first: the cascade below wipes every trace, and the audit log is then
  // the only record that this account ever existed.
  const [user, totalAscents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, username: true, createdAt: true },
    }),
    prisma.ascent.count({ where: { createdBy: userId } }),
  ]);
  if (!user) return false;

  if (tenantId) {
    const memberCount = await prisma.membership.count({ where: { tenantId } });
    if (memberCount === 1) {
      // Sole member: the tenant goes with them, cascading ascents and photos.
      await prisma.tenant.delete({ where: { id: tenantId } });
    } else {
      // Shared tenant: only this person leaves. Deleting it would take the other
      // members' ascents with it.
      await prisma.membership.deleteMany({ where: { userId, tenantId } });
    }
  }

  await prisma.user.delete({ where: { id: userId } });

  // Best-effort: losing the audit row must not fail a deletion the user already
  // confirmed and that has in fact happened.
  await prisma.deletedUserLog
    .create({
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        reason: "self",
        signupAt: user.createdAt,
        totalAscents,
      },
    })
    .catch((err: unknown) => console.error("[deleteAccount] audit log failed:", err));

  notifyUserDeleted({
    userId: user.id,
    email: user.email,
    name: user.name,
    reason: "self",
    signupAt: user.createdAt,
    totalAscents,
  });

  return true;
}
