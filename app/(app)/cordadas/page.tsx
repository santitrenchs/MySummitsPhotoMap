import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listFriends, listIncomingRequests, listSentRequests } from "@/lib/services/friendship.service";
import { listMyCordadas, listPendingInvites } from "@/lib/services/cordada.service";
import { CordadasClient } from "@/components/cordadas/CordadasClient";

export default async function CordadasPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  const [friends, incoming, sent, cordadas, cordadaInvites] = await Promise.all([
    listFriends(userId),
    listIncomingRequests(userId),
    listSentRequests(userId),
    listMyCordadas(userId),
    listPendingInvites(userId),
  ]);

  return (
    <CordadasClient
      userId={userId}
      friends={friends}
      incomingRequests={incoming.map((r) => ({
        friendshipId: r.id,
        userId: r.requesterId,
        name: r.requester.name ?? "",
        username: r.requester.username ?? null,
      }))}
      sentRequests={sent.map((r) => ({
        friendshipId: r.id,
        userId: r.addresseeId,
        name: r.addressee.name ?? "",
        username: r.addressee.username ?? null,
      }))}
      cordadas={cordadas}
      cordadaInvites={cordadaInvites}
    />
  );
}
