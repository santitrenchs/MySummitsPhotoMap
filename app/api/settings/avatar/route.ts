import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/r2";
import { NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const userId = session.user.id;
  const key = `avatars/${userId}.jpg`;

  try {
    // Overwrite any existing avatar at the same key
    try { await deleteFromR2(key); } catch { /* key might not exist yet */ }

    const avatarUrl = await uploadToR2({ key, body: buffer, contentType: file.type });
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });

    return NextResponse.json({ avatarUrl });
  } catch (err) {
    console.error("[avatar upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
