import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getFaceDetections, saveFaceDetections } from "@/lib/services/face-detection.service";
import { prisma } from "@/lib/db/client";
import { sendPhotoTagEmail } from "@/lib/email";

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
    // created[] is in the same order as faces[] (insertion order from $transaction)
    const created = await saveFaceDetections(session.user.tenantId, id, faces);

    // Tag faces in parallel — use created[i].id to guarantee alignment
    const { findOrCreatePerson } = await import("@/lib/services/person.service");
    const { setFaceTag } = await import("@/lib/services/face-detection.service");
    const tags = await Promise.all(faces.map(async (face, i) => {
      const personName = face?.personName?.trim();
      if (personName && created[i]) {
        const person = await findOrCreatePerson(session.user.tenantId, personName);
        return setFaceTag(session.user.tenantId, created[i].id, person.id, session.user.id);
      }
      return null;
    }));

    // Notify tagged users (fire-and-forget, non-blocking)
    const photo = await prisma.photo.findUnique({
      where: { id },
      include: { ascent: { include: { peak: true } } },
    });
    if (photo?.ascent) {
      const taggerName = session.user.name ?? session.user.email ?? "";
      const notifyIds = [...new Set(
        tags.flatMap((t) => t?.person?.userId && t.person.userId !== session.user.id ? [t.person.userId] : [])
      )];
      for (const userId of notifyIds) {
        prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, activityNotifications: true, language: true },
        }).then((u) => {
          if (u?.activityNotifications) {
            sendPhotoTagEmail(u.email, taggerName, photo.ascent!.peak.name, photo.ascent!.id, u.language)
              .catch((e) => console.error("[faces] tag email failed:", e));
          }
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[faces POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
