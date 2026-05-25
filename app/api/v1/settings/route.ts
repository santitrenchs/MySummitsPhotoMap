import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import { prisma } from "@/lib/db/client";
import { isValidLocale } from "@/lib/i18n";

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;

const PatchSchema = z.object({
  name:                  z.string().min(1).max(100).optional(),
  username:              z.string().max(20).nullable().optional(),
  bio:                   z.string().max(500).nullable().optional(),
  language:              z.string().optional(),
  appearInSearch:        z.boolean().optional(),
  allowOthersToTag:      z.boolean().optional(),
  emailNotifications:    z.boolean().optional(),
  activityNotifications: z.boolean().optional(),
});

const SELECT = {
  id: true, name: true, email: true, username: true, language: true,
  appearInSearch: true, allowOthersToTag: true,
  emailNotifications: true, activityNotifications: true,
  passwordHash: true,
  accounts: { select: { provider: true } },
};

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const row = await prisma.user.findUnique({ where: { id: session.userId }, select: SELECT });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { passwordHash, accounts, ...userFields } = row;
  const user = {
    ...userFields,
    hasPassword: !!passwordHash,
    googleLinked: accounts.some((a) => a.provider === "google"),
  };
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = { ...parsed.data };

  if ("username" in data && data.username != null) {
    const u = (data.username as string).trim();
    if (u && !USERNAME_RE.test(u)) {
      return NextResponse.json({ error: "invalid_username" }, { status: 400 });
    }
    data.username = u || null;
  }

  if ("name" in data) data.name = (data.name as string).trim();

  if ("language" in data && !isValidLocale(data.language)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({ where: { id: session.userId }, data, select: SELECT });
    return NextResponse.json({ user });
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes("Unique constraint") && msg.includes("username")) {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    console.error("[v1/settings PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
