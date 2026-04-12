import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n/server";
import { listFriends, listIncomingRequests, listSentRequests } from "@/lib/services/friendship.service";
import { FriendsClient } from "@/components/social/FriendsClient";

export default async function FriendsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const t = await getServerT();

  const [friends, incoming, sent] = await Promise.all([
    listFriends(session.user.id),
    listIncomingRequests(session.user.id),
    listSentRequests(session.user.id),
  ]);

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 12px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>
        {t.friends_title}
      </h1>
      <FriendsClient
        initialFriends={friends.map((f) => ({
          id: f.id,
          friend: f.friend,
          createdAt: f.createdAt.toISOString(),
        }))}
        initialIncoming={incoming.map((r) => ({
          id: r.id,
          requester: r.requester,
          createdAt: r.createdAt.toISOString(),
        }))}
        initialSent={sent.map((r) => ({
          id: r.id,
          addressee: r.addressee,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
