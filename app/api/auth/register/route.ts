import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${slugify(base)}-${suffix}`;
  }
  return slug;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = RegisterSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const [passwordHash, slug] = await Promise.all([
      hashPassword(password),
      uniqueSlug(name),
    ]);

    // Atomic: create user + tenant + membership in one transaction
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, passwordHash },
      });

      const tenant = await tx.tenant.create({
        data: { name, slug },
      });

      await tx.membership.create({
        data: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
      });
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
