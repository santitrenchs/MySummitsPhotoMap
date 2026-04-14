import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav/NavBar";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";
import { countPendingRequests } from "@/lib/services/friendship.service";
import { countPendingTagsForUser } from "@/lib/services/face-detection.service";
import { prisma } from "@/lib/db/client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const [locale, pendingFriendRequests, pendingTagCount, dbUser] = await Promise.all([
    getLocale(),
    countPendingRequests(session.user.id),
    countPendingTagsForUser(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } }),
  ]);

  return (
    <I18nProvider initialLocale={locale as Locale}>
      <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>
        <NavBar
          userName={session.user.name ?? null}
          userEmail={session.user.email ?? null}
          userAvatarUrl={dbUser?.avatarUrl ?? null}
          pendingFriendRequests={pendingFriendRequests}
          pendingTagCount={pendingTagCount}
        />
        <main style={{ flex: 1, paddingBottom: "var(--bottom-nav-h, 0px)" }}>
          {children}
        </main>
        <style>{`
          :root {
            --top-nav-h: 3rem;
            --bottom-nav-h: 0px;
          }
          @media (max-width: 639px) {
            :root {
              --top-nav-h: 52px;
              --bottom-nav-h: calc(60px + env(safe-area-inset-bottom));
            }
          }
        `}</style>
      </div>
    </I18nProvider>
  );
}
