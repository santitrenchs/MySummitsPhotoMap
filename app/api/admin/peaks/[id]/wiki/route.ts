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

// GET /api/admin/peaks/[id]/wiki — returns stored wiki texts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const wikiTexts = await prisma.peakWikiText.findMany({
    where: { peakId: id },
    orderBy: { lang: "asc" },
  });
  return NextResponse.json({ wikiTexts });
}

// POST /api/admin/peaks/[id]/wiki — fetch from Wikipedia and upsert
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const peak = await prisma.peak.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!peak) return NextResponse.json({ error: "Peak not found" }, { status: 404 });

  const results = await fetchWikiTextsForPeak(peak.name);

  await Promise.all(
    results.map((r) =>
      prisma.peakWikiText.upsert({
        where: { peakId_lang: { peakId: id, lang: r.lang } },
        create: { peakId: id, lang: r.lang, title: r.title, extract: r.extract },
        update: { title: r.title, extract: r.extract },
      })
    )
  );

  const wikiTexts = await prisma.peakWikiText.findMany({
    where: { peakId: id },
    orderBy: { lang: "asc" },
  });
  return NextResponse.json({ wikiTexts, fetched: results.length });
}
