import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/client";
import { uploadToR2 } from "@/lib/storage/r2";

// Same validation contract as the cordada avatar upload.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

// POST /api/admin/challenges/[id]/cover  — multipart form-data, field "file"
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const challenge = await prisma.challenge.findUnique({ where: { id }, select: { id: true } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string")
    return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES)
    return NextResponse.json({ error: "File too large" }, { status: 400 });

  // La clave es estable (challenges/{id}.jpg) para no dejar huérfanos en R2, así que
  // un PutObject ya sustituye el objeto: no hace falta borrarlo antes, y borrarlo era
  // peor que inútil — si la subida fallaba después, la portada anterior ya no existía
  // y la fila seguía apuntando a ella.
  const key = `challenges/${challenge.id}.jpg`;
  try {
    const url = await uploadToR2({ key, body: buffer, contentType: file.type });
    // Al ser la clave estable, la URL sería idéntica a la anterior y ni el navegador ni
    // el <img> volverían a pedirla: la portada nueva estaría en R2 pero nadie la vería.
    // El sufijo de versión es el mismo recurso que usa la subida de avatar.
    const coverUrl = `${url}?v=${Date.now()}`;
    await prisma.challenge.update({ where: { id: challenge.id }, data: { coverUrl } });
    return NextResponse.json({ coverUrl });
  } catch (err) {
    console.error("[admin/challenges/[id]/cover]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
