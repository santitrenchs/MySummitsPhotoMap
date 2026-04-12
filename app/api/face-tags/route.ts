import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { listPendingTagsForUser } from "@/lib/services/face-detection.service";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tags = await listPendingTagsForUser(session.user.id);
  return NextResponse.json(tags);
}
