import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { setFaceTag, removeFaceTag } from "@/lib/services/face-detection.service";
import { findOrCreatePerson } from "@/lib/services/person.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { personName } = await req.json();
  if (!personName?.trim()) return NextResponse.json({ error: "personName required" }, { status: 400 });
  const person = await findOrCreatePerson(session.user.tenantId, personName);
  const tag = await setFaceTag(session.user.tenantId, id, person.id);
  return NextResponse.json(tag);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await removeFaceTag(session.user.tenantId, id);
  return NextResponse.json({ ok: true });
}
