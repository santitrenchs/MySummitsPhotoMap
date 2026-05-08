import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { uploadPhoto } from "@/lib/services/photo.service";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const ascentId = formData.get("ascentId") as string | null;

  if (!file || !ascentId) {
    return NextResponse.json({ error: "file and ascentId are required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const photo = await uploadPhoto({
      tenantId: session.tenantId,
      ascentId,
      buffer,
      contentType: file.type,
    });
    return NextResponse.json({ photo }, { status: 201 });
  } catch (err) {
    console.error("[v1/photos/upload]", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
