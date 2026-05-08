import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { getFeed } from "@/lib/services/feed.service";

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cursor = new URL(req.url).searchParams.get("cursor") ?? undefined;
  const data = await getFeed(session.userId, cursor);
  return NextResponse.json(data);
}
