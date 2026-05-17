import NextAuth from "next-auth";
import type { AdapterUser } from "@auth/core/adapters";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { generateUniqueSlug, generateUniqueUsername } from "@/lib/utils/user-utils";
import { sendWelcomeEmail } from "@/lib/email";

const baseAdapter = PrismaAdapter(prisma);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: {
    ...baseAdapter,
    // When a new user signs in via Google, create Tenant + Membership too
    createUser: async (data) => {
      const user = await prisma.$transaction(async (tx) => {
        const username = await generateUniqueUsername(data.name ?? data.email ?? "user");
        const created = await tx.user.create({
          data: { ...data, name: data.name ?? data.email ?? "user", username },
        });
        const slug = await generateUniqueSlug(created.name ?? created.email);
        const tenant = await tx.tenant.create({
          data: { name: created.name ?? "My Team", slug },
        });
        await tx.membership.create({
          data: { userId: created.id, tenantId: tenant.id, role: "OWNER" },
        });
        sendWelcomeEmail(created.email, created.name, "es").catch((err) =>
          console.error("[auth] google welcome email failed:", err)
        );
        return created;
      });
      return user as unknown as AdapterUser;
    },
  },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
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

        if (!user || !user.passwordHash) return null;

        const valid = await verifyPassword(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.memberships[0]?.tenantId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id ?? "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.tenantId = (user as any).tenantId;
      }
      // For OAuth sign-ins, tenantId may not be in user — fetch from DB
      if (account && !token.tenantId) {
        const membership = await prisma.membership.findFirst({
          where: { userId: token.id as string },
          select: { tenantId: true },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (token as any).tenantId = membership?.tenantId ?? null;
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
