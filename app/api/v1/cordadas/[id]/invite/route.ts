import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { inviteToCordada } from "@/lib/services/cordada.service";

const InviteSchema = z.object({ userId: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = InviteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    await inviteToCordada(id, session.userId, parsed.data.userId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    const status = msg === "Only the owner can invite" ? 403
      : msg === "User is already a member or has a pending invite" ? 409
      : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
