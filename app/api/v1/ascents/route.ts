import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { listAscents, createAscent } from "@/lib/services/ascent.service";

const CreateSchema = z.object({
  peakId:      z.string().uuid(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  route:       z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ascents = await listAscents(session.tenantId);
  return NextResponse.json({ ascents });
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
