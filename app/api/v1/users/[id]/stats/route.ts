import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";

// Public stats for any user by id (no friendship restriction).
// Used by the friends/cordadas screen to show stats for friends AND
// cordada members who may not be friends of the requesting user.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, username: true, avatarUrl: true },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const stats = await prisma.userStats.findUnique({
    where: { userId: id },
    select: {
      totalAscents: true,
      uniquePeaks:  true,
      maxAltitudeM: true,
      totalEp:      true,
      totalCairns:  true,
      levelIdx:     true,
    },
  });

  return NextResponse.json({
    user,
    totalAscents: stats?.totalAscents ?? 0,
    uniquePeaks:  stats?.uniquePeaks  ?? 0,
    maxAltitudeM: stats?.maxAltitudeM ?? 0,
    totalEp:      stats?.totalEp      ?? 0,
    totalCairns:  stats?.totalCairns  ?? 0,
    levelIdx:     stats?.levelIdx     ?? 1,
  });
}
