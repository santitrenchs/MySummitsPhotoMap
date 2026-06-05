import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureElevationProfileForPeak } from "@/lib/services/elevation.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const profile = await ensureElevationProfileForPeak(id);
    if (!profile) {
      return NextResponse.json({ error: "Peak not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (err) {
    console.error(`[elevation] Failed for peak ${id}:`, err);
    return NextResponse.json({ error: "Failed to fetch elevation data" }, { status: 502 });
  }
}
