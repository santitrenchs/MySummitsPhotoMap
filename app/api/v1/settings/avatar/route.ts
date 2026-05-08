import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/r2";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const key = `avatars/${session.userId}.jpg`;
  try {
    try { await deleteFromR2(key); } catch { /* key might not exist yet */ }
    const avatarUrl = await uploadToR2({ key, body: buffer, contentType: file.type });
    await prisma.user.update({ where: { id: session.userId }, data: { avatarUrl } });
    return NextResponse.json({ avatarUrl });
  } catch (err) {
    console.error("[v1/settings/avatar]", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
