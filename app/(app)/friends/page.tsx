import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n/server";
import { listFriends, listIncomingRequests, listSentRequests, listBlockedUsers } from "@/lib/services/friendship.service";
import { listPendingTagsForUser } from "@/lib/services/face-detection.service";
import { FriendsClient } from "@/components/social/FriendsClient";

export default async function FriendsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const t = await getServerT();

  const [friends, incoming, sent, blocked, pendingTags] = await Promise.all([
    listFriends(session.user.id),
    listIncomingRequests(session.user.id),
    listSentRequests(session.user.id),
    listBlockedUsers(session.user.id),
    listPendingTagsForUser(session.user.id),
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
        initialBlocked={blocked.map((b) => ({
          id: b.id,
          user: b.addressee,
          createdAt: b.createdAt.toISOString(),
        }))}
        initialPendingTags={pendingTags.map((tag) => ({
          id: tag.id,
          personName: tag.person.name,
          photoUrl: tag.faceDetection.photo.url,
          peakName: tag.faceDetection.photo.ascent.peak.name,
          ascentId: tag.faceDetection.photo.ascent.id,
          createdAt: tag.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
