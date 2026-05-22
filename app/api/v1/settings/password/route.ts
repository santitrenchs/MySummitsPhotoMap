import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";
import { verifyPassword, hashPassword } from "@/lib/auth/password";

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8),
});

export async function POST(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { passwordHash: true } });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "wrong_password" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.userId }, data: { passwordHash: await hashPassword(newPassword) } });
  return NextResponse.json({ ok: true });
}
