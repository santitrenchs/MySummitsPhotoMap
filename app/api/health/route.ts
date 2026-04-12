import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "(not set)";
  // Mask password for safety
  const masked = dbUrl.replace(/:([^:@]+)@/, ":***@");

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: masked });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: masked, error: String(err) },
      { status: 500 }
    );
  }
}
