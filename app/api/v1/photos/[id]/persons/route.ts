import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";
import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { setFaceTag } from "@/lib/services/face-detection.service";
import { sendPhotoTagEmail } from "@/lib/email";

const Schema = z.object({ userId: z.string().uuid() });

// GET — list persons currently tagged on this photo
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const photo = await prisma.photo.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const db = await getTenantConnection(session.tenantId);
  const tags = await db.faceTag.findMany({
    where: { tenantId: session.tenantId, faceDetection: { photoId: id } },
    include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
  });

  return NextResponse.json({
    persons: tags.flatMap((t) => t.user ? [t.user] : []),
  });
}

// POST — manually tag a user on this photo (no face detection, full-image bounding box)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { userId } = parsed.data;

  const photo = await prisma.photo.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { ascent: { include: { peak: true } } },
  });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const db = await getTenantConnection(session.tenantId);

  // Create a full-image bounding box detection (manual tag, no face detection)
  const detection = await db.faceDetection.create({
    data: {
      tenantId: session.tenantId,
      photoId: id,
      boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    },
  });

  const tag = await setFaceTag(session.tenantId, detection.id, userId, session.userId);
  if (!tag) {
    // setFaceTag returns null if user blocks tagging or no friendship
    await db.faceDetection.delete({ where: { id: detection.id } });
    return NextResponse.json({ error: "tagging_not_allowed" }, { status: 403 });
  }

  // Notify tagged user (fire-and-forget)
  if (photo.ascent && userId !== session.userId) {
    const tagger = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, activityNotifications: true, emailNotifications: true, language: true },
    }).then((u) => {
      if (u?.activityNotifications && u.emailNotifications && tagger) {
        sendPhotoTagEmail(u.email, tagger.name ?? "", photo.ascent!.peak.name, photo.ascent!.id, u.language, photo.url)
          .catch((e) => console.error("[v1/persons POST] tag email failed:", e));
      }
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE — remove a tag for a user from this photo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { userId } = parsed.data;

  const photo = await prisma.photo.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const db = await getTenantConnection(session.tenantId);
  const tag = await db.faceTag.findFirst({
    where: { tenantId: session.tenantId, userId, faceDetection: { photoId: id } },
  });
  if (!tag) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Only the photo owner or the tagged user can remove a tag
  const photoOwner = await prisma.ascent.findFirst({
    where: { id: photo.ascentId, createdBy: session.userId },
  });
  if (!photoOwner && userId !== session.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.faceTag.delete({ where: { id: tag.id } });
  return NextResponse.json({ ok: true });
}
