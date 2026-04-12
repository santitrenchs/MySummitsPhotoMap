import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n/server";
import { listFriends, listIncomingRequests, listSentRequests, listBlockedUsers } from "@/lib/services/friendship.service";
import { listPendingTagsForUser } from "@/lib/services/face-detection.service";
import { listPersonsWithStats } from "@/lib/services/person.service";
import { FriendsClient } from "@/components/social/FriendsClient";
import { PersonsClient, type PersonCard } from "@/components/persons/PersonsClient";

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

  // Load rich person cards for friends who have linked their account
  const friendUserIds = friends.map((f) => f.friend.id);
  const rawLinkedPersons = friendUserIds.length > 0
    ? await listPersonsWithStats(session.user.tenantId, friendUserIds)
    : [];

  const linkedPersonCards: PersonCard[] = rawLinkedPersons.map((person) => {
    const ascentMap = new Map<string, { id: string; peakName: string; altitudeM: number; photoUrl: string; date: string }>();
    for (const tag of person.faceTags) {
      const photo = tag.faceDetection.photo;
      const ascent = photo.ascent;
      if (!ascentMap.has(ascent.id)) {
        ascentMap.set(ascent.id, {
          id: ascent.id,
          peakName: ascent.peak.name,
          altitudeM: ascent.peak.altitudeM,
          photoUrl: photo.url,
          date: ascent.date.toISOString(),
        });
      }
    }
    const ascents = Array.from(ascentMap.values());
    const highestPeak = ascents.reduce<{ name: string; altitudeM: number } | null>(
      (best, a) => (!best || a.altitudeM > best.altitudeM ? { name: a.peakName, altitudeM: a.altitudeM } : best),
      null
    );
    const lastAscentDate = ascents.length
      ? [...ascents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
      : null;
    const firstTag = person.faceTags[0] ?? null;
    const avatarFaceBox = firstTag
      ? (firstTag.faceDetection.boundingBox as { x: number; y: number; width: number; height: number } | null)
      : null;

    return {
      id: person.id,
      name: person.name,
      email: person.email ?? null,
      photoCount: person.faceTags.length,
      ascentCount: ascents.length,
      highestPeak,
      lastAscentDate,
      lastTaggedAt: firstTag ? firstTag.createdAt.toISOString() : null,
      avatarPhotoUrl: firstTag?.faceDetection.photo.url ?? null,
      avatarFaceBox,
      ascents: Array.from(ascentMap.values()),
    };
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 12px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>
        {t.friends_title}
      </h1>

      {/* ── Social management (requests, pending tags, blocked) ── */}
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

      {/* ── Rich person cards for linked friends ── */}
      {linkedPersonCards.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" }}>
            {t.friends_title} · {linkedPersonCards.length}
          </h2>
          <PersonsClient persons={linkedPersonCards} />
        </div>
      )}
    </div>
  );
}
