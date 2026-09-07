import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import type { Session } from "next-auth";

/**
 * Admin guard for /api/admin/* route handlers.
 *
 * ⚠️ Do NOT rely on proxy.ts alone: the middleware reads `isAdmin` from the JWT, so a
 * user whose admin flag was revoked keeps passing it until their session expires. This
 * helper re-reads the flag from the database, which is what actually closes that hole.
 * Same check the existing /api/admin/peaks routes do inline.
 */
export async function requireAdmin(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return dbUser?.isAdmin ? session : null;
}
