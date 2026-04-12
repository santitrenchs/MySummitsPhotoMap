import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { listPersons, findOrCreatePerson } from "@/lib/services/person.service";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const persons = await listPersons(session.user.tenantId, q ?? undefined);
  return NextResponse.json(persons);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const person = await findOrCreatePerson(session.user.tenantId, name);
  return NextResponse.json(person);
}
