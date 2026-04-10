import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  // Required for Railway / custom domain deployments
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            memberships: {
              select: { tenantId: true },
              take: 1,
            },
          },
        });

        if (!user) return null;

        const valid = await verifyPassword(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          // Attach tenantId so it lands in the JWT on first sign-in
          tenantId: user.memberships[0]?.tenantId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.tenantId = (user as any).tenantId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.tenantId = token.tenantId as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
