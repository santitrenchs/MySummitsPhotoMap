import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export interface V1Session {
  userId: string;
  tenantId: string;
}

/**
 * Accepts both:
 *  - HTTP-only cookie (web, existing behaviour)
 *  - Authorization: Bearer <token> (mobile)
 */
export async function getV1Session(req: NextRequest): Promise<V1Session | null> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  // next-auth/jwt reads the cookie automatically; for Bearer we inject it
  const authHeader = req.headers.get("authorization");
  let token;

  if (authHeader?.startsWith("Bearer ")) {
    const raw = authHeader.slice(7);
    // Wrap the raw JWT so getToken can decode it as if it came from a cookie
    const fakeReq = new Request(req.url, {
      headers: { cookie: `authjs.session-token=${raw}` },
    });
    token = await getToken({ req: fakeReq as unknown as Parameters<typeof getToken>[0]["req"], secret });
  } else {
    token = await getToken({ req, secret });
  }

  if (!token?.id || !token?.tenantId) return null;

  return {
    userId: token.id as string,
    tenantId: token.tenantId as string,
  };
}
