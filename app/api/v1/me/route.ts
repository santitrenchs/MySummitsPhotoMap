import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      avatarUrl: true,
    },
  });

  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ user, tenantId: session.tenantId });
}
