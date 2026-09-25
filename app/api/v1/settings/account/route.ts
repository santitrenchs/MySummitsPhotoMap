import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { deleteAccount } from "@/lib/services/account.service";

/**
 * DELETE /api/v1/settings/account — the user deletes their own account.
 *
 * Google Play has required an in-app deletion path since 2023 for any app that
 * lets you create an account, so this is what makes the Android build compliant.
 *
 * The user id comes from the JWT and nowhere else: a body parameter here would be
 * an account-deletion primitive pointed at whoever you like.
 */
export async function DELETE(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const ok = await deleteAccount(session.userId, session.tenantId);
    if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/v1/settings/account DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
