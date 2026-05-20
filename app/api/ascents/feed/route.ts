import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { fetchFeedPage } from "@/lib/services/ascent-feed";
import { getLocale } from "@/lib/i18n/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const beforeOwn = req.nextUrl.searchParams.get("beforeOwn");
  const beforeFriends = req.nextUrl.searchParams.get("beforeFriends");

  const locale = await getLocale();

  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: session.user.id }, { addresseeId: session.user.id }] },
    select: { requesterId: true, addresseeId: true },
  });
  const friendUserIds = friendships.map((f) =>
    f.requesterId === session.user.id ? f.addresseeId : f.requesterId
  );

  const result = await fetchFeedPage({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    friendUserIds,
    locale,
    beforeOwn: beforeOwn ? new Date(beforeOwn) : undefined,
    beforeFriends: beforeFriends ? new Date(beforeFriends) : undefined,
    skipUnseen: true,
  });

  return NextResponse.json(result);
}
