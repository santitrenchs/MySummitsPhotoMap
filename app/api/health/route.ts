import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

const isProd = process.env.RAILWAY_ENVIRONMENT_NAME === "production";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    // In production: return the bare minimum — no infra details
    if (isProd) {
      return NextResponse.json({ ok: true });
    }

    // In non-production: include debug info for local/staging troubleshooting
    const dbUrl = process.env.DATABASE_URL ?? "(not set)";
    const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
    return NextResponse.json({
      ok: true,
      db: dbUrl.replace(/:([^:@]+)@/, ":***@"),
      version: {
        env: process.env.RAILWAY_ENVIRONMENT_NAME ?? "local",
        branch: process.env.RAILWAY_GIT_BRANCH ?? "local",
        commit: sha ? sha.slice(0, 7) : "local",
      },
    });
  } catch (err) {
    // Never leak details in production
    if (isProd) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
