import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") ?? "";

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ valid: false, available: false });
  }

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  // Available if no match, or the match is the current user (no change)
  const available = !existing || existing.id === session.user.id;
  return NextResponse.json({ valid: true, available });
}
