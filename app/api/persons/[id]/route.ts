import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { updatePerson, deletePerson } from "@/lib/services/person.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { name, email } = body as { name?: string; email?: string | null };
  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }
  await updatePerson(session.user.tenantId, id, { name, email });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deletePerson(session.user.tenantId, id);
  return NextResponse.json({ ok: true });
}
