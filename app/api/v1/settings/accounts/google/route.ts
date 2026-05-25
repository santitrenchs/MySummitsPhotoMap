import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";

export async function DELETE(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Safety check: user must have a password before unlinking Google
  // to prevent being locked out of their account.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "need_password", message: "Set a password before unlinking Google." },
      { status: 400 }
    );
  }

  await prisma.account.deleteMany({
    where: { userId: session.userId, provider: "google" },
  });

  return NextResponse.json({ ok: true });
}
