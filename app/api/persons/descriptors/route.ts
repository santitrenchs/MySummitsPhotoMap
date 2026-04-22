import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getKnownDescriptors } from "@/lib/services/face-detection.service";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const descriptors = await getKnownDescriptors(session.user.tenantId, session.user.id);
    return NextResponse.json(descriptors);
  } catch (err) {
    console.error("[/api/persons/descriptors]", err);
    return NextResponse.json([]);
  }
}
