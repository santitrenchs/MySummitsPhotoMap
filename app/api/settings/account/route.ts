import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const tenantId = session.user.tenantId;

  try {
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
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE account]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
