import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getFaceDetections, saveFaceDetections } from "@/lib/services/face-detection.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const detections = await getFaceDetections(session.user.tenantId, id);
  return NextResponse.json(detections);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { faces } = await req.json();
  if (!Array.isArray(faces)) return NextResponse.json({ error: "faces required" }, { status: 400 });
  try {
    await saveFaceDetections(session.user.tenantId, id, faces);
    const detections = await getFaceDetections(session.user.tenantId, id);
    return NextResponse.json(detections);
  } catch (err) {
    console.error("[faces POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
