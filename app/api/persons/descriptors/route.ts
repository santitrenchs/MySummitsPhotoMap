import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getKnownDescriptors } from "@/lib/services/face-detection.service";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const descriptors = await getKnownDescriptors(session.user.tenantId);
  return NextResponse.json(descriptors);
}
