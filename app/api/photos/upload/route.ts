import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadPhoto } from "@/lib/services/photo.service";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const ascentId = formData.get("ascentId") as string | null;

  if (!file || !ascentId) {
    return NextResponse.json({ error: "file and ascentId are required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG or WebP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large. Max 10 MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const photo = await uploadPhoto({
      tenantId: session.user.tenantId,
      ascentId,
      buffer,
      contentType: file.type,
    });
    return NextResponse.json(photo, { status: 201 });
  } catch (err) {
    console.error("[photos/upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
