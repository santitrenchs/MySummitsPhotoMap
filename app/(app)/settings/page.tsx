import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { getLinkedPersonGlobal } from "@/lib/services/person.service";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user, linkedPerson] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        language: true,
        profilePublic: true,
        appearInSearch: true,
        reviewTagsBeforePost: true,
        allowOthersToTag: true,
        emailNotifications: true,
        activityNotifications: true,
        autoDetectFaces: true,
        autoSuggestPeople: true,
        reviewFacesBeforeSave: true,
      },
    }),
    getLinkedPersonGlobal(session.user.id),
  ]);

  if (!user) redirect("/login");

  return (
    <SettingsClient
      initialUser={user}
      initialLinkedPerson={linkedPerson ? { id: linkedPerson.id, name: linkedPerson.name } : null}
    />
  );
}
