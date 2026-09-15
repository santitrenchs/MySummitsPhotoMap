import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";
import { listAscents, createAscent } from "@/lib/services/ascent.service";
import { recomputeUserStats } from "@/lib/services/stats.service";
import { getPeakStats } from "@/lib/services/peak.service";

const CreateSchema = z.object({
  peakId:      z.string().uuid(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  route:       z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});

type PageCursor = { beforeOwn?: string; beforeFriends?: string };

// Opaque cursor — a base64url-encoded JSON object carrying each stream's own "before"
// date so pagination can page own + friends' ascents independently (they live in
// different databases and can't share a single SQL cursor).
function decodeCursor(raw: string): PageCursor | null {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as PageCursor;
  } catch {
    return null;
  }
}

function encodeCursor(cursor: PageCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: session.userId }, { addresseeId: session.userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  const friendUserIds = friendships.map((f) =>
    f.requesterId === session.userId ? f.addresseeId : f.requesterId
  );

  // Backward compatibility: a `cursor` query param (even empty, meaning "first
  // paginated page") opts into the new paginated response shape. Clients that never
  // send it (already-published app builds that predate this change) keep getting the
  // full, unpaginated list exactly as before.
  if (!req.nextUrl.searchParams.has("cursor")) {
    const ascents = await listAscents(session.tenantId, session.userId, friendUserIds);
    const uniquePeakIds = [...new Set(ascents.map((a) => a.peakId))];
    const peakStatsMap = await getPeakStats(uniquePeakIds);
    const ascentsWithStats = ascents.map((a) => ({
      ...a,
      peakStats: peakStatsMap.get(a.peakId) ?? null,
    }));
    return NextResponse.json({ ascents: ascentsWithStats });
  }

  const rawCursor = req.nextUrl.searchParams.get("cursor") ?? "";
  const cursor = decodeCursor(rawCursor);
  if (cursor === null) return NextResponse.json({ error: "invalid_cursor" }, { status: 400 });

  const { items, nextBeforeOwn, nextBeforeFriends, hasMore } = await listAscents(
    session.tenantId,
    session.userId,
    friendUserIds,
    {
      paginate: true,
      skipUnseen: rawCursor !== "", // unseen-first fetch only runs once, on the first page
      beforeOwn: cursor.beforeOwn ? new Date(cursor.beforeOwn) : undefined,
      beforeFriends: cursor.beforeFriends ? new Date(cursor.beforeFriends) : undefined,
    },
  );

  const uniquePeakIds = [...new Set(items.map((a) => a.peakId))];
  const peakStatsMap = await getPeakStats(uniquePeakIds);
  const ascentsWithStats = items.map((a) => ({
    ...a,
    peakStats: peakStatsMap.get(a.peakId) ?? null,
  }));

  const nextCursor = hasMore
    ? encodeCursor({ beforeOwn: nextBeforeOwn ?? undefined, beforeFriends: nextBeforeFriends ?? undefined })
    : null;

  return NextResponse.json({ ascents: ascentsWithStats, hasMore, nextCursor });
}

export async function POST(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const ascent = await createAscent(session.tenantId, {
    ...parsed.data,
    createdBy: session.userId,
  });
  await recomputeUserStats(session.userId);
  return NextResponse.json({ ascent }, { status: 201 });
}
