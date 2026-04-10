import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const peaks = await prisma.peak.findMany({
    orderBy: { altitudeM: "desc" },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      altitudeM: true,
      mountainRange: true,
      country: true,
    },
  });

  return NextResponse.json(peaks);
}
