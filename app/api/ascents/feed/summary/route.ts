import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { fetchFeedSummary, type View, type Rarity, type TimeRange } from "@/lib/services/ascent-feed";

const RARITIES: ReadonlySet<Rarity> = new Set([
  "daisy", "gentian", "edelweiss", "saxifrage", "cinquefoil", "snow_lotus",
]);
const VIEWS: ReadonlySet<View> = new Set(["mine", "friends", "with-me", "person"]);
const TIME_RANGES: ReadonlySet<TimeRange> = new Set(["all", "month", "year"]);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = req.nextUrl.searchParams;

  const viewStr = p.get("view");
  const rarityStr = p.get("rarity");
  const timeRangeStr = p.get("timeRange");

  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: session.user.id }, { addresseeId: session.user.id }] },
    select: { requesterId: true, addresseeId: true },
  });
  const friendUserIds = friendships.map((f) =>
    f.requesterId === session.user.id ? f.addresseeId : f.requesterId
  );

  const summary = await fetchFeedSummary({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    friendUserIds,
    view: viewStr && VIEWS.has(viewStr as View) ? (viewStr as View) : undefined,
    personId: p.get("personId") ?? undefined,
    peakId: p.get("peakId") ?? undefined,
    month: p.get("month") ?? undefined,
    rarity: rarityStr && RARITIES.has(rarityStr as Rarity) ? (rarityStr as Rarity) : undefined,
    mythic: p.get("mythic") === "1",
    timeRange: timeRangeStr && TIME_RANGES.has(timeRangeStr as TimeRange) ? (timeRangeStr as TimeRange) : undefined,
  });

  return NextResponse.json(summary);
}
