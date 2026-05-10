import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export const revalidate = 300; // 5 min cache

export async function GET() {
  const [totalPeaks, capturedPeaksRaw, totalAscents] = await Promise.all([
    prisma.peak.count(),
    prisma.ascent.findMany({ select: { peakId: true }, distinct: ["peakId"] }),
    prisma.ascent.count(),
  ]);

  return NextResponse.json({
    totalRarities: 6,
    totalPeaks,
    capturedPeaks: capturedPeaksRaw.length,
    totalAscents,
  });
}
