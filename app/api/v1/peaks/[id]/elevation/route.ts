import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { ensureElevationProfileForPeak } from "@/lib/services/elevation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const profile = await ensureElevationProfileForPeak(id);
    if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (err) {
    console.error(`[v1 elevation] Failed for peak ${id}:`, err);
    return NextResponse.json({ error: "Failed to fetch elevation data" }, { status: 502 });
  }
}
