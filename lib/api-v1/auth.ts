import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export interface V1Session {
  userId: string;
  tenantId: string;
}

export async function getV1Session(req: NextRequest): Promise<V1Session | null> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const authHeader = req.headers.get("authorization");

  // Bearer token (mobile clients)
  if (authHeader?.startsWith("Bearer ")) {
    const raw = authHeader.slice(7);
    try {
      const { payload } = await jwtVerify(raw, new TextEncoder().encode(secret));
      const userId = payload.id as string | undefined;
      const tenantId = payload.tenantId as string | undefined;
      if (!userId || !tenantId) return null;
      return { userId, tenantId };
    } catch {
      return null;
    }
  }

  // Cookie session fallback (web client)
  const session = await auth();
  if (session?.user?.id && session?.user?.tenantId) {
    return { userId: session.user.id, tenantId: session.user.tenantId };
  }

  return null;
}
