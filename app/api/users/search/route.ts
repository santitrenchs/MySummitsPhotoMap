import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { searchUsers } from "@/lib/services/user-search.service";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const users = await searchUsers(q, session.user.id);
  return NextResponse.json(users);
}
