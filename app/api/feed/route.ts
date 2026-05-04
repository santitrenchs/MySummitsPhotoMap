import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFeed } from "@/lib/services/feed.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;

  const data = await getFeed(session.user.id, cursor);
  return NextResponse.json(data);
}
