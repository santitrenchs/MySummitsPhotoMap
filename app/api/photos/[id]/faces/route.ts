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

    // Tag faces that have a personName (from PhotoTagStep)
    const { findOrCreatePerson } = await import("@/lib/services/person.service");
    const { setFaceTag } = await import("@/lib/services/face-detection.service");
    for (let i = 0; i < faces.length; i++) {
      const personName = faces[i]?.personName?.trim();
      if (personName && detections[i]) {
        const person = await findOrCreatePerson(session.user.tenantId, personName);
        await setFaceTag(session.user.tenantId, detections[i].id, person.id);
      }
    }

    const withTags = await getFaceDetections(session.user.tenantId, id);
    return NextResponse.json(withTags);
  } catch (err) {
    console.error("[faces POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
