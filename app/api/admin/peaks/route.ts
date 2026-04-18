import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return dbUser?.isAdmin ? session : null;
}

// GET /api/admin/peaks?q=...&page=1&limit=50
export async function GET(req: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "50")));
  const skip = (page - 1) * limit;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { comarca: { contains: q, mode: "insensitive" as const } },
          { mountainRange: { contains: q, mode: "insensitive" as const } },
          { country: { contains: q, mode: "insensitive" as const } },
          { tag1: { contains: q, mode: "insensitive" as const } },
          { tag2: { contains: q, mode: "insensitive" as const } },
          { tag3: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [peaks, total] = await Promise.all([
    prisma.peak.findMany({
      where,
      orderBy: [{ altitudeM: "desc" }, { name: "asc" }],
      skip,
      take: limit,
      select: {
        id: true, name: true, latitude: true, longitude: true,
        altitudeM: true, country: true, mountainRange: true,
        comarca: true, tag1: true, tag2: true, tag3: true,
        _count: { select: { ascents: true } },
      },
    }),
    prisma.peak.count({ where }),
  ]);

  return NextResponse.json({ peaks, total, page, limit });
}
