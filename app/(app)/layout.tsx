import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav/NavBar";
import { Sidebar } from "@/components/nav/Sidebar";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";
import { countPendingRequests } from "@/lib/services/friendship.service";
import { countUnseenFeed } from "@/lib/services/feed.service";
import { prisma } from "@/lib/db/client";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "@/lib/legal/versions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  const [locale, pendingFriendRequests, unseenFeedCount, dbUser, termsConsent, privacyConsent] = await Promise.all([
    getLocale(),
    countPendingRequests(userId),
    countUnseenFeed(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } }),
    prisma.legalConsent.findUnique({
      where: { userId_documentType_version: { userId, documentType: "terms",   version: CURRENT_TERMS_VERSION   } },
    }),
    prisma.legalConsent.findUnique({
      where: { userId_documentType_version: { userId, documentType: "privacy", version: CURRENT_PRIVACY_VERSION } },
    }),
  ]);

  // Redirect to re-acceptance page if user hasn't accepted current T&C or Privacy versions
  if (!termsConsent || !privacyConsent) {
    redirect("/accept-terms");
  }

  const navProps = {
    userName: session.user.name ?? null,
    userEmail: session.user.email ?? null,
    userAvatarUrl: dbUser?.avatarUrl ?? null,
    pendingFriendRequests,
    unseenFeedCount,
  };


  return (
    <>
    {/* maplibre-gl styles — only loaded for authenticated app pages, not landing */}
    {/* eslint-disable-next-line @next/next/no-page-custom-font */}
    <link rel="stylesheet" href="/maplibre-gl.css" />
    <I18nProvider initialLocale={locale as Locale}>
      <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>
        {/* Desktop sidebar (fixed, hidden on mobile via CSS) */}
        <Sidebar {...navProps} />

        {/* Mobile header + bottom tab bar (hidden on desktop via CSS) */}
        <NavBar {...navProps} />

        {/* Main content — offset right on desktop via .azi-main CSS class */}
        <main className="azi-main" style={{ flex: 1, paddingBottom: "var(--bottom-nav-h, 0px)" }}>
          {children}
        </main>

        <style>{`
          :root {
            --top-nav-h: 0px;
            --bottom-nav-h: 0px;
          }
          @media (max-width: 639px) {
            :root {
              --top-nav-h: 52px;
              --bottom-nav-h: calc(60px + env(safe-area-inset-bottom));
            }
          }

          /* Desktop: sidebar overlays on hover — content always offset by collapsed width */
          @media (min-width: 640px) {
            .azi-main {
              margin-left: 68px;
            }
          }
        `}</style>
      </div>
    </I18nProvider>
    </>
  );
}
