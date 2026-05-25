import { NextResponse } from "next/server";

// Voucher system has been removed. Registration no longer requires an invitation code.
export async function POST() {
  return NextResponse.json({ error: "feature_removed" }, { status: 410 });
}
