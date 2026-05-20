import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { fetchFeedPage, type View, type Rarity, type TimeRange } from "@/lib/services/ascent-feed";
import { getLocale } from "@/lib/i18n/server";

const RARITIES: ReadonlySet<Rarity> = new Set([
  "daisy", "gentian", "edelweiss", "saxifrage", "cinquefoil", "snow_lotus",
]);
const VIEWS: ReadonlySet<View> = new Set(["mine", "friends", "with-me", "person"]);
const TIME_RANGES: ReadonlySet<TimeRange> = new Set(["all", "month", "year"]);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = req.nextUrl.searchParams;

  const beforeOwn = p.get("beforeOwn");
  const beforeFriends = p.get("beforeFriends");
  const viewStr = p.get("view");
  const rarityStr = p.get("rarity");
  const timeRangeStr = p.get("timeRange");

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
    view: viewStr && VIEWS.has(viewStr as View) ? (viewStr as View) : undefined,
    personId: p.get("personId") ?? undefined,
    peakId: p.get("peakId") ?? undefined,
    month: p.get("month") ?? undefined,
    rarity: rarityStr && RARITIES.has(rarityStr as Rarity) ? (rarityStr as Rarity) : undefined,
    mythic: p.get("mythic") === "1",
    timeRange: timeRangeStr && TIME_RANGES.has(timeRangeStr as TimeRange) ? (timeRangeStr as TimeRange) : undefined,
    highlightId: p.get("highlightId") ?? undefined,
  });

  return NextResponse.json(result);
}
