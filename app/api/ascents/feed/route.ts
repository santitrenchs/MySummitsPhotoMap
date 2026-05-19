import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { fetchFeedPage } from "@/lib/services/ascent-feed";
import { getLocale } from "@/lib/i18n/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const before = req.nextUrl.searchParams.get("before");
  const beforeDate = before ? new Date(before) : undefined;

  const locale = await getLocale();

  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: session.user.id }, { addresseeId: session.user.id }] },
    select: { requesterId: true, addresseeId: true },
  });
  const friendUserIds = friendships.map((f) =>
    f.requesterId === session.user.id ? f.addresseeId : f.requesterId
  );

  const { ascents, hasMore } = await fetchFeedPage({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    friendUserIds,
    locale,
    before: beforeDate,
    skipUnseen: true,
  });

  return NextResponse.json({ ascents, hasMore });
}
