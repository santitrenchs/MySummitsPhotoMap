import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markSeen } from "@/lib/services/feed.service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const ascentIds: string[] = Array.isArray(body.ascentIds) ? body.ascentIds : [];

  await markSeen(session.user.id, ascentIds);
  return NextResponse.json({ ok: true });
}
