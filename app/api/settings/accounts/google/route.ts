import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json({ error: "set_password_first" }, { status: 400 });
  }

  await prisma.account.deleteMany({
    where: { userId: session.user.id, provider: "google" },
  });

  return NextResponse.json({ ok: true });
}
