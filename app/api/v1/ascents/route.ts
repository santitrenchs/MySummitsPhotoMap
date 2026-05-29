import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";
import { listAscents, createAscent } from "@/lib/services/ascent.service";
import { getPeakStats } from "@/lib/services/peak.service";

const CreateSchema = z.object({
  peakId:      z.string().uuid(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  route:       z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});

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

  const ascents = await listAscents(session.tenantId, session.userId, friendUserIds);

  // Attach global peak stats (total ascents + unique climbers across all tenants)
  const uniquePeakIds = [...new Set(ascents.map((a) => a.peakId))];
  const peakStatsMap = await getPeakStats(uniquePeakIds);
  const ascentsWithStats = ascents.map((a) => ({
    ...a,
    peakStats: peakStatsMap.get(a.peakId) ?? null,
  }));

  return NextResponse.json({ ascents: ascentsWithStats });
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
  return NextResponse.json({ ascent }, { status: 201 });
}
