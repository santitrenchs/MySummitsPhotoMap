import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { setFaceTag, removeFaceTag } from "@/lib/services/face-detection.service";
import { prisma } from "@/lib/db/client";
import { sendPhotoTagEmail } from "@/lib/email";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { userId } = await req.json();
  if (!userId?.trim()) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const tag = await setFaceTag(session.user.tenantId, id, userId, session.user.id);

  // Notify tagged user
  const taggedUserId = tag?.userId;
  const isSelf = taggedUserId === session.user.id;
  if (tag && taggedUserId && !isSelf) {
    const [taggedUser, detection] = await Promise.all([
      prisma.user.findUnique({
        where: { id: taggedUserId },
        select: { email: true, activityNotifications: true, language: true },
      }),
      prisma.faceDetection.findUnique({
        where: { id },
        include: { photo: { include: { ascent: { include: { peak: true } } } } },
      }),
    ]);
    if (taggedUser?.activityNotifications && detection?.photo?.ascent) {
      sendPhotoTagEmail(
        taggedUser.email,
        session.user.name ?? session.user.email ?? "",
        detection.photo.ascent.peak.name,
        detection.photo.ascent.id,
        taggedUser.language,
      ).catch((e) => console.error("[face-tag] email failed:", e));
    }
  }

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
