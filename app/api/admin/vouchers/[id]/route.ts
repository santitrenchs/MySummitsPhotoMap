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

// ── DELETE /api/admin/vouchers/[id] ──────────────────────────────────────────
// Deletes the voucher if unused, returns 409 if it has been used.

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const voucher = await prisma.voucher.findUnique({
    where: { id },
    select: { id: true, usedCount: true },
  });

  if (!voucher) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (voucher.usedCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a voucher that has already been used" },
      { status: 409 }
    );
  }

  await prisma.voucher.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
