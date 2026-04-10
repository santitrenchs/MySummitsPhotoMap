import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listAscents, createAscent } from "@/lib/services/ascent.service";

const CreateSchema = z.object({
  peakId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  route: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ascents = await listAscents(session.user.tenantId);
  return NextResponse.json(ascents);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const input = CreateSchema.parse(body);
    const ascent = await createAscent(session.user.tenantId, {
      ...input,
      createdBy: session.user.id,
    });
    return NextResponse.json(ascent, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[ascents POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
