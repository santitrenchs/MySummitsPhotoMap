/**
 * Lightweight public endpoint that returns ascent data for OG image generation.
 * Used by the edge-runtime opengraph-image route, which cannot use Prisma directly.
 * No auth required — only returns data for ascents where isPublic = true.
 */
import { NextResponse } from "next/server";
import { getPublicAscent } from "@/lib/services/public-ascent.service";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ascent = await getPublicAscent(id);
  if (!ascent) return new NextResponse(null, { status: 404 });
  return NextResponse.json(ascent, {
    headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600" },
  });
}
