import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "(not set)";
  const masked = dbUrl.replace(/:([^:@]+)@/, ":***@");

  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  const version = {
    env: process.env.RAILWAY_ENVIRONMENT_NAME ?? "local",
    branch: process.env.RAILWAY_GIT_BRANCH ?? "local",
    commit: sha ? sha.slice(0, 7) : "local",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: masked, version });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: masked, version, error: String(err) },
      { status: 500 }
    );
  }
}
