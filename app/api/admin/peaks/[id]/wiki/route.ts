import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { fetchWikiTextsForPeak } from "@/lib/services/wiki.service";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return dbUser?.isAdmin ? session : null;
}

// GET /api/admin/peaks/[id]/wiki
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const wikiTexts = await prisma.peakWikiText.findMany({
      where: { peakId: id },
      orderBy: { lang: "asc" },
    });
    return NextResponse.json({ wikiTexts });
  } catch (err) {
    console.error("[wiki GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/admin/peaks/[id]/wiki — fetch from Wikipedia and upsert
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const peak = await prisma.peak.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!peak) return NextResponse.json({ error: "Peak not found" }, { status: 404 });

    const results = await fetchWikiTextsForPeak(peak.name);

    await Promise.all(
      results.map((r) =>
        prisma.peakWikiText.upsert({
          where: { peakId_lang: { peakId: id, lang: r.lang } },
          create: {
            peakId: id, lang: r.lang, title: r.title,
            body: r.body, wikiUrl: r.wikiUrl, confidence: r.confidence,
            status: "auto", fetchedAt: new Date(),
          },
          update: {
            title: r.title, body: r.body, wikiUrl: r.wikiUrl,
            confidence: r.confidence, status: "auto", fetchedAt: new Date(),
          },
        })
      )
    );

    const wikiTexts = await prisma.peakWikiText.findMany({
      where: { peakId: id },
      orderBy: { lang: "asc" },
    });
    return NextResponse.json({ wikiTexts, fetched: results.length });
  } catch (err) {
    console.error("[wiki POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
