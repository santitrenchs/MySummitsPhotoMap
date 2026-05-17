import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return dbUser?.isAdmin ? session : null;
}

// DELETE /api/admin/users/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, isAdmin: true },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (user.isAdmin) return NextResponse.json({ error: "No se puede eliminar otro administrador" }, { status: 400 });

  // Cascade delete in correct dependency order
  await prisma.$transaction(async (tx) => {
    // Face tags → face detections → photos → ascents
    await tx.faceTag.deleteMany({ where: { faceDetection: { photo: { ascent: { createdBy: id } } } } });
    await tx.faceDetection.deleteMany({ where: { photo: { ascent: { createdBy: id } } } });
    await tx.photo.deleteMany({ where: { ascent: { createdBy: id } } });
    await tx.ascent.deleteMany({ where: { createdBy: id } });
    // Social
    await tx.friendship.deleteMany({ where: { OR: [{ requesterId: id }, { addresseeId: id }] } });
    await tx.feedSeen.deleteMany({ where: { userId: id } });
    // Auth
    await tx.account.deleteMany({ where: { userId: id } });
    await tx.passwordResetToken.deleteMany({ where: { email: user.email } });
    // Invitations (vouchers created by this user)
    await tx.voucher.deleteMany({ where: { inviterId: id } });
    // Membership
    await tx.membership.deleteMany({ where: { userId: id } });
    // Finally the user
    await tx.user.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
