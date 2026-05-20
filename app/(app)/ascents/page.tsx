import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AscentsClient } from "@/components/ascents/AscentsClient";
import { OpenAscentModalButton } from "@/components/ascents/OpenAscentModalButton";
import { getServerT, getLocale } from "@/lib/i18n/server";
import { prisma } from "@/lib/db/client";
import { fetchFeedPage, type View, type Rarity } from "@/lib/services/ascent-feed";

const RARITIES: ReadonlySet<Rarity> = new Set(["daisy", "gentian", "edelweiss", "saxifrage", "cinquefoil", "snow_lotus"]);
const VIEWS: ReadonlySet<View> = new Set(["mine", "friends", "with-me", "person"]);

export default async function AscentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const [t, locale, sp] = await Promise.all([getServerT(), getLocale(), searchParams]);

  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: session.user.id }, { addresseeId: session.user.id }] },
    select: { requesterId: true, addresseeId: true },
  });

  const friendUserIds = friendships.map((f) =>
    f.requesterId === session.user.id ? f.addresseeId : f.requesterId
  );

  // Read URL params for initial server-side filtering (matches what AscentsClient will hydrate)
  const getStr = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const highlight = getStr("highlight");
  const viewParam = getStr("view");
  const initialView: View = highlight ? "mine" : (viewParam && VIEWS.has(viewParam as View) ? viewParam as View : "friends");
  const rarityParam = getStr("rarity");
  const initialRarity = rarityParam && RARITIES.has(rarityParam as Rarity) ? rarityParam as Rarity : undefined;

  const { ascents, hasMore, nextBeforeOwn, nextBeforeFriends } = await fetchFeedPage({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    friendUserIds,
    locale,
    view: initialView,
    peakId: getStr("peak"),
    month: getStr("month"),
    rarity: initialRarity,
    highlightId: highlight,
  });

  const allPersonsMap = new Map<string, { id: string; name: string }>();
  for (const a of ascents) {
    allPersonsMap.set(a.createdByUserId, { id: a.createdByUserId, name: a.userName });
    for (const p of a.persons) allPersonsMap.set(p.id, p);
  }
  const allPersons = Array.from(allPersonsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const allYears = [...new Set(ascents.map((a) => new Date(a.date).getFullYear()))].sort((a, b) => b - a);

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 12px" }}>
      <div className="ascents-page-header" style={{ display: "none" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>{t.nav_ascents}</h1>
        <OpenAscentModalButton
          label={t.ascents_newAscent}
          style={{ padding: "8px 16px", background: "#0369a1", color: "white", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 600 }}
        />
      </div>

      <Suspense>
        <AscentsClient
          ascents={ascents}
          allPersons={allPersons}
          allYears={allYears}
          currentUserEmail={session.user.email}
          currentUserName={session.user.name ?? ""}
          currentUserId={session.user.id}
          hasFriends={friendUserIds.length > 0}
          hasMore={hasMore}
          initialBeforeOwn={nextBeforeOwn}
          initialBeforeFriends={nextBeforeFriends}
          friendUserIds={friendUserIds}
        />
      </Suspense>
    </div>
  );
}
