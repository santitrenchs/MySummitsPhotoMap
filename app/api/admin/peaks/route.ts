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
  const gpsVerified = searchParams.get("gpsVerified"); // "yes" | "no" | null
  const ascents = searchParams.get("ascents"); // "with" | "without" | null
  const sort = searchParams.get("sort") ?? "pending";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { comarca: { contains: q, mode: "insensitive" } },
      { mountainRange: { contains: q, mode: "insensitive" } },
      { country: { contains: q, mode: "insensitive" } },
      { tag1: { contains: q, mode: "insensitive" } },
      { tag2: { contains: q, mode: "insensitive" } },
      { tag3: { contains: q, mode: "insensitive" } },
    ];
  }
  if (gpsVerified === "yes") where.gpsVerified = true;
  if (gpsVerified === "no") where.gpsVerified = false;
  if (ascents === "with") where.ascents = { some: {} };
  if (ascents === "without") where.ascents = { none: {} };

  const orderBy =
    sort === "name"
      ? [{ name: "asc" as const }]
      : sort === "altitude"
        ? [{ altitudeM: "desc" as const }, { name: "asc" as const }]
        : sort === "ascents_desc"
          ? [{ ascents: { _count: "desc" as const } }, { name: "asc" as const }]
          : sort === "ascents_asc"
            ? [{ ascents: { _count: "asc" as const } }, { name: "asc" as const }]
            : [{ gpsVerified: "asc" as const }, { altitudeM: "desc" as const }, { name: "asc" as const }];

  const [peaks, total] = await Promise.all([
    prisma.peak.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true, name: true, latitude: true, longitude: true,
        altitudeM: true, country: true, mountainRange: true,
        comarca: true, tag1: true, tag2: true, tag3: true,
        gpsVerified: true,
        _count: { select: { ascents: true } },
      },
    }),
    prisma.peak.count({ where }),
  ]);

  return NextResponse.json({ peaks, total, page, limit });
}

// POST /api/admin/peaks — create a new peak (always gpsVerified: true)
export async function POST(req: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const latitude = parseFloat(body.latitude);
  const longitude = parseFloat(body.longitude);
  const altitudeM = parseInt(body.altitudeM);
  if (isNaN(latitude) || isNaN(longitude) || isNaN(altitudeM))
    return NextResponse.json({ error: "latitude, longitude, altitudeM required" }, { status: 400 });

  const peak = await prisma.peak.create({
    data: {
      name,
      latitude,
      longitude,
      altitudeM,
      country: (body.country ?? "ES").toUpperCase(),
      mountainRange: body.mountainRange?.trim() || null,
      comarca: body.comarca?.trim() || null,
      tag1: body.tag1?.trim() || null,
      tag2: body.tag2?.trim() || null,
      tag3: body.tag3?.trim() || null,
      gpsVerified: true,
      osmId: body.osmId?.trim() || null,
    },
  });
  return NextResponse.json(peak, { status: 201 });
}
