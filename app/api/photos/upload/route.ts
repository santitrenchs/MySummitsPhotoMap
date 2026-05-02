import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadPhoto, CropMeta } from "@/lib/services/photo.service";
import { getTenantConnection } from "@/lib/db/tenant-resolver";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const ascentId = formData.get("ascentId") as string | null;
  const originalFile = formData.get("originalFile") as File | null;
  const cropMetaRaw = formData.get("cropMeta") as string | null;
  // Re-crop flow: reuse the originalStorageKey from an existing photo instead of uploading a new one
  const reuseOriginalPhotoId = formData.get("reuseOriginalPhotoId") as string | null;

  if (!file || !ascentId) {
    return NextResponse.json({ error: "file and ascentId are required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG or WebP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large. Max 10 MB." }, { status: 400 });
  }

  if (originalFile && originalFile.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Original file too large. Max 10 MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    let originalBuffer: Buffer | undefined;
    let cropMeta: CropMeta | undefined;
    let reuseOriginalStorageKey: string | undefined;

    if (reuseOriginalPhotoId && cropMetaRaw) {
      // Re-crop: look up the originalStorageKey of the source photo and reuse it
      const db = await getTenantConnection(session.user.tenantId);
      const sourcePhoto = await db.photo.findFirst({
        where: { id: reuseOriginalPhotoId, tenantId: session.user.tenantId },
        select: { originalStorageKey: true },
      });
      if (sourcePhoto?.originalStorageKey) {
        reuseOriginalStorageKey = sourcePhoto.originalStorageKey;
        try {
          cropMeta = JSON.parse(cropMetaRaw) as CropMeta;
        } catch {
          return NextResponse.json({ error: "Invalid cropMeta JSON" }, { status: 400 });
        }
      }
    } else if (originalFile && cropMetaRaw) {
      originalBuffer = Buffer.from(await originalFile.arrayBuffer());
      try {
        cropMeta = JSON.parse(cropMetaRaw) as CropMeta;
      } catch {
        return NextResponse.json({ error: "Invalid cropMeta JSON" }, { status: 400 });
      }
    }

    const photo = await uploadPhoto({
      tenantId: session.user.tenantId,
      ascentId,
      buffer,
      contentType: file.type,
      originalBuffer,
      cropMeta,
      reuseOriginalStorageKey,
    });
    return NextResponse.json(photo, { status: 201 });
  } catch (err) {
    console.error("[photos/upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
