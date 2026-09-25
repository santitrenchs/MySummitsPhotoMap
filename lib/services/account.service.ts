import { prisma } from "@/lib/db/client";
import { notifyUserDeleted, sendCordadaOwnershipEmail } from "@/lib/email";
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
  const soleMember =
    tenantId != null && (await prisma.membership.count({ where: { tenantId } })) === 1;

  // Dos ámbitos, unidos y deduplicados. El del tenant recoge también lo que no
  // cuelgue de una ascensión suya; el de `createdBy` alcanza cualquier otro tenant
  // del que sea miembro, cuyas fotos el primero no vería.
  const photos = await prisma.photo.findMany({
    where: {
      OR: [
        ...(soleMember && tenantId ? [{ tenantId }] : []),
        { ascent: { createdBy: userId } },
      ],
    },
    select: { storageKey: true, originalStorageKey: true },
  });
  const photoKeys = [
    ...new Set(
      photos.flatMap((p) =>
        [p.storageKey, p.originalStorageKey].filter((k): k is string => !!k),
      ),
    ),
  ];

  if (tenantId) {
    if (soleMember) {
      // Sole member: the tenant goes with them, cascading ascents and photos.
      await prisma.tenant.delete({ where: { id: tenantId } });
    } else {
      // Tenant compartido: solo se va esta persona. Borrarlo se llevaría por
      // delante las ascensiones de los demás.
      await prisma.membership.deleteMany({ where: { userId, tenantId } });
    }
  }

  // Las ascensiones son de la persona, no del grupo: se van con ella y el grupo
  // se queda con un miembro menos. Además es lo que desbloquea el borrado —
  // `Ascent.user` es una relación obligatoria sin `onDelete`, o sea `Restrict`
  // por defecto, y cualquier fila que siga apuntando al usuario haría fallar el
  // `user.delete()` de más abajo.
  //
  // En la rama de miembro único no borra nada: la cascada del tenant ya se las
  // llevó. Aquí cubre el tenant compartido y cualquier otro del que fuera miembro.
  await prisma.ascent.deleteMany({ where: { createdBy: userId } });

  // Las cordadas que posee cambian de dueño antes de que el usuario desaparezca.
  //
  // `Cordada.owner` es una relación obligatoria sin `onDelete`, y el valor por
  // defecto de Prisma en ese caso es `Restrict`: sin esto, `user.delete()` lanza y
  // quien haya creado una cordada no puede darse de baja. Disolver la cordada no
  // era opción — se llevaría por delante el grupo de los demás miembros.
  //
  // Hereda el miembro aceptado más antiguo. Es el criterio menos arbitrario que no
  // exige preguntar a nadie: quien lleva más tiempo dentro es quien más contexto
  // tiene del grupo. Los invitados pendientes no cuentan: todavía no han dicho que
  // sí, y despertarse siendo dueño de un grupo al que no te habías unido es peor
  // que quedarse sin cordada.
  const ownedCordadas = await prisma.cordada.findMany({
    where: { ownerId: userId },
    select: { id: true, name: true },
  });
  const heirsToNotify: { email: string; cordadaName: string; locale: string }[] = [];

  for (const { id: cordadaId, name: cordadaName } of ownedCordadas) {
    const heir = await prisma.cordadaMember.findFirst({
      where: { cordadaId, userId: { not: userId }, status: "ACCEPTED" },
      orderBy: [{ joinedAt: "asc" }, { createdAt: "asc" }],
      select: { userId: true, user: { select: { email: true, language: true } } },
    });
    if (heir) {
      // En transacción: una cordada cuyo `ownerId` apunta a alguien que no es OWNER
      // en `cordada_members` rompe las comprobaciones de permiso de todo el
      // servicio de cordadas, que consulta las dos cosas.
      await prisma.$transaction([
        prisma.cordada.update({ where: { id: cordadaId }, data: { ownerId: heir.userId } }),
        prisma.cordadaMember.update({
          where: { cordadaId_userId: { cordadaId, userId: heir.userId } },
          data: { role: "OWNER" },
        }),
      ]);
      // Se acumula y se envía al final: si el correo se mandara aquí y el borrado
      // fallara después, alguien recibiría el aviso de una herencia que no ocurrió.
      if (heir.user?.email) {
        heirsToNotify.push({
          email: heir.user.email,
          cordadaName,
          locale: heir.user.language ?? "es",
        });
      }
    } else {
      // Nadie a quien transferir: la cordada era solo suya y se va con él.
      await prisma.cordada.delete({ where: { id: cordadaId } });
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

  // Best-effort, ya consumado el borrado: quien hereda tiene que enterarse, pero
  // un fallo de Resend no puede deshacer una cuenta que ya no existe.
  for (const h of heirsToNotify) {
    sendCordadaOwnershipEmail(h.email, h.cordadaName, user.name, h.locale).catch(
      (err: unknown) => console.error("[deleteAccount] aviso de herencia de cordada falló:", err),
    );
  }

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
