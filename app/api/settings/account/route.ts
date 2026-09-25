import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { deleteAccount } from "@/lib/services/account.service";

// DELETE /api/settings/account — the user deletes their own account.
// All the work is in the service, shared with the mobile v1 route.
export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ok = await deleteAccount(session.user.id, session.user.tenantId);
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE account]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
