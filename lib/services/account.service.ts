import { prisma } from "@/lib/db/client";
import { notifyUserDeleted } from "@/lib/email";
import { deleteFromR2 } from "@/lib/storage/r2";

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

  // R2 does not take part in Prisma's cascade, so the object keys have to be read
  // while the rows still exist. Read them afterwards and there is no longer any way
  // to tell which files belonged to this user: they stay in the bucket for ever.
  //
  // Only the sole-member branch collects them. In a shared tenant the ascents (and
  // therefore the photos) survive the departure, so their files must not be touched.
  let photoKeys: string[] = [];
  const soleMember =
    tenantId != null && (await prisma.membership.count({ where: { tenantId } })) === 1;

  if (tenantId) {
    if (soleMember) {
      const photos = await prisma.photo.findMany({
        where: { tenantId },
        select: { storageKey: true, originalStorageKey: true },
      });
      photoKeys = photos.flatMap((p) =>
        [p.storageKey, p.originalStorageKey].filter((k): k is string => !!k),
      );
      // Sole member: the tenant goes with them, cascading ascents and photos.
      await prisma.tenant.delete({ where: { id: tenantId } });
    } else {
      // Shared tenant: only this person leaves. Deleting it would take the other
      // members' ascents with it.
      await prisma.membership.deleteMany({ where: { userId, tenantId } });
    }
  }

  await prisma.user.delete({ where: { id: userId } });

  // The avatar is keyed by user id and belongs to the person, not to the tenant,
  // so it goes in both branches. Its key is rebuilt rather than derived from
  // `avatarUrl`, which is a CDN URL and may carry a cache-busting query.
  const objectKeys = [...photoKeys, `avatars/${userId}.jpg`];

  // Best-effort and after the fact: the account is already gone and the user has
  // been told so. A bucket error must not turn a deletion that did happen into a
  // 500 that invites them to retry. What it must do is leave a trace, because an
  // orphaned photo is personal data outliving an erasure request (GDPR art. 17)
  // and nothing else would ever notice.
  const results = await Promise.allSettled(objectKeys.map((k) => deleteFromR2(k)));
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.error(
      `[deleteAccount] ${failed}/${objectKeys.length} R2 objects left behind for user ${userId}`,
    );
  }

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
