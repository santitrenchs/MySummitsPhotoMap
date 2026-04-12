import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { isValidLocale } from "@/lib/i18n";

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, username: true, language: true,
      profilePublic: true, reviewTagsBeforePost: true, allowOthersToTag: true,
      emailNotifications: true, activityNotifications: true,
      autoDetectFaces: true, autoSuggestPeople: true, reviewFacesBeforeSave: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const allowed = [
    "name", "username", "language",
    "profilePublic", "reviewTagsBeforePost", "allowOthersToTag",
    "emailNotifications", "activityNotifications",
    "autoDetectFaces", "autoSuggestPeople", "reviewFacesBeforeSave",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  if ("username" in data) {
    const u = (data.username as string)?.trim() ?? "";
    if (u && !USERNAME_RE.test(u)) {
      return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
    }
    data.username = u || null;
  }

  if ("name" in data) {
    const n = (data.name as string).trim();
    if (!n) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = n;
  }

  if ("language" in data && !isValidLocale(data.language)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true, name: true, email: true, username: true, language: true,
        profilePublic: true, reviewTagsBeforePost: true, allowOthersToTag: true,
        emailNotifications: true, activityNotifications: true,
        autoDetectFaces: true, autoSuggestPeople: true, reviewFacesBeforeSave: true,
      },
    });

    // Build response — set locale cookie if language changed
    const res = NextResponse.json(user);
    if ("language" in data) {
      res.cookies.set("locale", data.language, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: "lax",
        httpOnly: false, // readable by client for immediate context update
      });
    }
    return res;
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes("Unique constraint") && msg.includes("username")) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
