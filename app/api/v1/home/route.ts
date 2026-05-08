import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { getHomeData } from "@/lib/services/home.service";

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const data = await getHomeData(session.userId);
  return NextResponse.json(data);
}
