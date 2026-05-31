import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { removeMember } from "@/lib/services/cordada.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, userId } = await params;
  try {
    await removeMember(id, session.userId, userId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    const status = msg === "Not authorized" ? 403
      : msg === "Owner cannot leave — delete the cordada instead" ? 400
      : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
