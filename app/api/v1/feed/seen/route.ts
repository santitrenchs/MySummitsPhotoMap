import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { markSeen } from "@/lib/services/feed.service";

export async function POST(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ascentIds: string[] = Array.isArray(body.ascentIds) ? body.ascentIds : [];

  await markSeen(session.userId, ascentIds);
  return NextResponse.json({ ok: true });
}
