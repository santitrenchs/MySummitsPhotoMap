import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { searchUsers } from "@/lib/services/user-search.service";

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const users = await searchUsers(q, session.userId);
  return NextResponse.json({ users });
}
