import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { listMyCordadas, listPendingInvites, createCordada } from "@/lib/services/cordada.service";

const CreateSchema = z.object({
  name:        z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  memberIds:   z.array(z.string()).max(50).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [cordadas, pendingInvites] = await Promise.all([
    listMyCordadas(session.userId),
    listPendingInvites(session.userId),
  ]);

  return NextResponse.json({ cordadas, pendingInvites });
}

export async function POST(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const cordada = await createCordada(
      session.userId,
      parsed.data.name,
      parsed.data.description,
      parsed.data.memberIds,
    );
    return NextResponse.json({ cordada: { id: cordada.id } }, { status: 201 });
  } catch (err) {
    console.error("[v1/cordadas POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
