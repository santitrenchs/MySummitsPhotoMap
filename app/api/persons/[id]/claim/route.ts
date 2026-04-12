import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { claimPersonProfileGlobal, unclaimPersonProfileGlobal } from "@/lib/services/person.service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const person = await claimPersonProfileGlobal(id, session.user.id);
    return NextResponse.json({ id: person.id, name: person.name });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await unclaimPersonProfileGlobal(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
