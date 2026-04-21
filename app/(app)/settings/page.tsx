import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { SettingsClient } from "@/components/settings/SettingsClient";
export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      language: true,
      appearInSearch: true,
      reviewTagsBeforePost: true,
      allowOthersToTag: true,
      emailNotifications: true,
      activityNotifications: true,
      autoDetectFaces: true,
      autoSuggestPeople: true,
      reviewFacesBeforeSave: true,
    },
  });

  if (!user) redirect("/login");

  return <SettingsClient initialUser={user} />;
}
