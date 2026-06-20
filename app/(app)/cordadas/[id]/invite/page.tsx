import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getCordadaDetail } from "@/lib/services/cordada.service";
import { listFriends } from "@/lib/services/friendship.service";
import { CordadaInviteClient } from "@/components/cordadas/CordadaInviteClient";

export default async function CordadaInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const [cordada, friends] = await Promise.all([
    getCordadaDetail(id, session.user.id),
    listFriends(session.user.id),
  ]);

  if (!cordada) notFound();
  if (!cordada.isOwner) redirect(`/cordadas/${id}`);

  // Friends not already in the cordada
  const memberIds = new Set(cordada.members.map((m) => m.userId));
  const invitableFriends = friends.filter((f) => !memberIds.has(f.friend.id));

  const acceptedCount = cordada.members.filter((m) => !m.isPending).length;

  return (
    <CordadaInviteClient
      cordadaId={id}
      cordadaName={cordada.name}
      cordadaAvatarUrl={cordada.avatarUrl ?? null}
      memberCount={acceptedCount}
      invitableFriends={invitableFriends}
    />
  );
}
