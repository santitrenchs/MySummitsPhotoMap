import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { notifyUserDeleted } from "@/lib/email";

export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const tenantId = session.user.tenantId;

  try {
    // Snapshot before the cascade wipes every trace of the account.
    const [user, totalAscents] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, username: true, createdAt: true },
      }),
      prisma.ascent.count({ where: { createdBy: userId } }),
    ]);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Delete tenant if this user is the sole member (cascades ascents, photos, etc.)
    if (tenantId) {
      const memberCount = await prisma.membership.count({ where: { tenantId } });
      if (memberCount === 1) {
        await prisma.tenant.delete({ where: { id: tenantId } });
      } else {
        // Just remove the membership
        await prisma.membership.deleteMany({ where: { userId, tenantId } });
      }
    }

    // Delete user (cascades remaining memberships)
    await prisma.user.delete({ where: { id: userId } });

    // Audit trail — the only record that this account ever existed.
    await prisma.deletedUserLog.create({
      data: {
        userId:   user.id,
        email:    user.email,
        name:     user.name,
        username: user.username,
        reason:   "self",
        signupAt: user.createdAt,
        totalAscents,
      },
    }).catch((err: unknown) => console.error("[DELETE account] audit log failed:", err));

    notifyUserDeleted({
      userId: user.id,
      email:  user.email,
      name:   user.name,
      reason: "self",
      signupAt: user.createdAt,
      totalAscents,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE account]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
