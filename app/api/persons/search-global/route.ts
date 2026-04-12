import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { searchPersonsGlobal } from "@/lib/services/person.service";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const persons = await searchPersonsGlobal(q);
  return NextResponse.json(persons);
}
